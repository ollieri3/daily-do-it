import express from "express";
import { engine } from "express-handlebars";
import { fileURLToPath } from "url";
import { getPortPromise as getPort } from "portfinder";
import { pbkdf2, timingSafeEqual } from "crypto";
import { Strategy as LocalStrategy } from "passport-local";
import passport from "passport";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import dayjs from "dayjs";
import localeData from "dayjs/plugin/localeData.js";
import bodyParser from "body-parser";
import csrf from "csrf";
import helmet from "helmet";
import validator from "validator";
import z from "zod";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

import { ENV } from "./lib/environment.js";
import { TRUSTED_IPS_CSV } from "./lib/proxy.js";
import { addRoutes } from "./routes.js";
import { pool } from "./lib/db.js";
import { emailSchema, passwordSchema } from "./helpers/validations.js";

declare module "express-session" {
  interface SessionData {
    flash: any; //TODO: Make this sensible
  }
}

const Tokens = new csrf();

dayjs.extend(localeData);

const pgSession = connectPgSimple(session);

const port = await getPort();

const app = express();

if (ENV.DEPLOYMENT === "prod") {
  app.set(
    "trust proxy",
    `loopback, linklocal, uniquelocal, ${TRUSTED_IPS_CSV}`,
  );
}

// Static files
app.use(
  express.static(fileURLToPath(new URL(".", import.meta.url) + "public")),
);

app.use(
  session({
    name: "dailydoit.sid",
    store: new pgSession({
      pool,
      createTableIfMissing: true,
    }),
    secret: ENV.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      secure: ENV.DEPLOYMENT === "prod",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    },
  }),
);

app.use(passport.session());

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "img-src": ["'self'", "data:", "img.shields.io"], // Allow img.shields.io for footer badges
      },
    },
  }),
);

/**
 * Temporarily disable any cacheing, this is to prevent
 * outdated csrf tokens encoded in views from being cached by the browser
 *
 * TODO: Make this dynamic based on the request
 */
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

app.engine(
  "handlebars",
  engine({
    defaultLayout: "main",
    helpers: {
      section: function (name: string, options: any) {
        if (!this._sections) this._sections = {};
        (this._sections as any)[name] = options.fn(this);
        return null;
      },
    },
  }),
);
app.set("view engine", "handlebars");

app.set("views", fileURLToPath(new URL(".", import.meta.url) + "views"));

// Enable reading of URL Encoded Request bodies
app.use(bodyParser.urlencoded({ extended: true }));

// Link json parser middleware to parse json body
app.use(bodyParser.json());

// Passport Setup
passport.use(
  "local",
  new LocalStrategy({ passReqToCallback: true }, async function verify(
    req,
    email,
    password,
    done,
  ) {
    const signInSchema = z.object({
      email: emailSchema,
      password: passwordSchema,
    });

    const result = signInSchema.safeParse({
      email,
      password,
    });

    if (result.success === false) {
      const { fieldErrors } = result.error.flatten();
      let message = "";
      if (fieldErrors.email) {
        message += `<li>${fieldErrors.email}</li>`;
      }
      if (fieldErrors.password) {
        message += `<li>${fieldErrors.password}</li>`;
      }
      req.session.flash = message;
      return req.session.save(() => {
        done(null);
      });
    }

    // Normalize the email
    const emailNormalized = validator.default.normalizeEmail(email, {
      gmail_remove_subaddress: false,
    });
    if (!emailNormalized) {
      throw new Error("An unexpected error ocurred when normalizing email");
    }

    const { rows } = await pool.query(
      `SELECT id, email, salt, hashed_password FROM users WHERE email = $1`,
      [emailNormalized],
    );

    const row = rows[0];
    if (!row) {
      req.session.flash = `<li>Incorrect email or password.</li>`;
      return req.session.save(() => {
        done(null);
      });
    }

    const salt = Buffer.from(row.salt, "hex");
    pbkdf2(password, salt, 600_000, 32, "sha256", (err, derivedKey) => {
      if (err) return done(err);
      const hash = Buffer.from(row.hashed_password, "hex");
      if (!timingSafeEqual(hash, derivedKey)) {
        req.session.flash = `<li>Incorrect email or password.</li>`;
        return req.session.save(() => {
          done(null);
        });
      }
      return done(null, row);
    });
  }),
);

// Google Oauth
passport.use(
  new GoogleStrategy(
    {
      clientID: ENV.GOOGLE_CLIENT_ID,
      clientSecret: ENV.GOOGLE_CLIENT_SECRET,
      callbackURL: "/oauth2/redirect/google",
      scope: ["email"],
      passReqToCallback: true,
    },
    async function verify(req, _accessToken, _refreshToken, profile, done) {
      try {
        // Check if the user has logged in before
        const federatedCredentialsQuery = await pool.query(
          `SELECT id, user_id FROM federated_credentials WHERE provider = $1 AND provider_user_id = $2`,
          [profile.provider, profile.id],
        );

        if (federatedCredentialsQuery.rowCount > 0) {
          //TODO: Add better error handling
          // User has logged in with Google before
          const userQuery = await pool.query(
            `SELECT id, email FROM users WHERE id = $1`,
            [federatedCredentialsQuery.rows[0].user_id],
          );
          done(null, userQuery.rows[0]);
        } else {
          // Create new federated_credential & user
          await pool.query("BEGIN");
          const userQuery = await pool.query(
            `INSERT INTO users(email, active) VALUES($1, true) RETURNING id, email`,
            [(profile.emails as any)[0].value], //TODO: Improve this
          );
          await pool.query(
            `INSERT INTO federated_credentials(user_id, provider, provider_user_id) VALUES($1, $2, $3)`,
            [userQuery.rows[0].id, profile.provider, profile.id],
          );
          await pool.query("COMMIT");
          done(null, userQuery.rows[0]);
        }
      } catch (err) {
        console.log("err: ", err);
      }
    },
  ),
);

passport.serializeUser((user: any, cb) => {
  return cb(null, { id: user.id, email: user.email });
});

passport.deserializeUser((user: any, cb) => {
  return cb(null, user);
});

// Provide values to all templates
app.use((req, res, next) => {
  // Provide user info to templates
  if (req.user) res.locals.user = req.user;

  // Powers the dynamic favicons set in main template
  const todaysDate = dayjs().get("date");
  res.locals.todaysDate = todaysDate;

  // Determine whether to initiate analytics
  res.locals.enableAnalytics = ENV.DEPLOYMENT === "prod";

  // Provide flash messages to templates
  if (req.session.flash) {
    res.locals.flash = req.session.flash;
    delete req.session.flash;
  }
  next();
});

// Generate CSRF token for session if necessary
app.use((req, res, next) => {
  const csrfSecret = Tokens.secretSync();
  if (!(req.session as any).csrfSecret) {
    (req.session as any).csrfSecret = csrfSecret;
  }
  if (!(req.session as any).csrfToken) {
    (req.session as any).csrfToken = Tokens.create(csrfSecret);
  }
  res.locals._csrfToken = (req.session as any).csrfToken;
  next();
});

// Validate any incoming csrf tokens
app.use((req, res, next) => {
  const ignoredMethods = ["GET", "HEAD", "OPTIONS"];
  if (ignoredMethods.includes(req.method)) {
    return next();
  }

  const clientToken = req.body._csrf || req.headers["x-csrf-token"];
  if (!clientToken) {
    res.status(403).send("No CSRF token provided");
    return;
  }
  const userCsrfSecret = (req.session as any).csrfSecret;
  if (!Tokens.verify(userCsrfSecret, clientToken)) {
    res.status(403).send("Invalid csrf token");
    return;
  }
  // Continue as normal
  next();
});

addRoutes(app);

app.listen(port, () =>
  console.log(
    `Express started on http://localhost:${port} \n` +
      `Press Ctrl-C to terminate`,
  ),
);
