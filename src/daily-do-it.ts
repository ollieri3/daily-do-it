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
import z from "zod";
import validator from "validator";

import { ENV } from "./lib/environment.js";
import { TRUSTED_IPS_CSV } from "./lib/proxy.js";
import { addRoutes } from "./routes.js";
import { pool } from "./lib/db.js";

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

// Static files
app.use(
  express.static(fileURLToPath(new URL(".", import.meta.url) + "public")),
);

// Enable reading of URL Encoded Request bodies
app.use(bodyParser.urlencoded({ extended: true }));

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
      sameSite: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    },
  }),
);
app.use(passport.authenticate("session"));

// Link json parser middleware to parse json body
app.use(bodyParser.json());

const emailSchema = z
  .string()
  .trim()
  .min(1)
  .max(254)
  .refine((val) => validator.default.isEmail(val), {
    message: "The email provided is not a valid email",
  });

const passwordSchema = z.string().min(1).max(100);

// Passport Setup
passport.use(
  "local",
  new LocalStrategy(async function verify(email, password, cb) {
    // Input validations
    const emailValidation = emailSchema.safeParse(email);
    if (emailValidation.success === false) {
      return cb(null, false, {
        message: emailValidation.error.issues
          .map((issue) => `${issue.message}\n`)
          .join(),
      });
    }
    const passwordValiation = passwordSchema.safeParse(password);
    if (passwordValiation.success === false) {
      return cb(null, false, {
        message: passwordValiation.error.issues
          .map((issue) => `${issue.message}\n`)
          .join(),
      });
    }

    const { rows } = await pool.query(
      `SELECT id, email, salt, hashed_password FROM users WHERE email = $1`,
      [email],
    );

    const row = rows[0];
    if (!row) {
      return cb(null, false, { message: "Incorrect email or password." });
    }

    const salt = Buffer.from(row.salt, "hex");
    pbkdf2(password, salt, 600_000, 32, "sha256", (err, derivedKey) => {
      if (err) return cb(err);
      const hash = Buffer.from(row.hashed_password, "hex");
      if (!timingSafeEqual(hash, derivedKey)) {
        return cb(null, false, { message: "Incorrect email or password" });
      }
      return cb(null, row);
    });
  }),
);

passport.serializeUser((user: any, cb) => {
  process.nextTick(async () => {
    return cb(null, { id: user.id, email: user.email });
  });
});

passport.deserializeUser((user: any, cb) => {
  process.nextTick(() => {
    return cb(null, user);
  });
});

// Provide values to all templates
app.use((req, res, next) => {
  if (req.user) res.locals.user = req.user;

  // Powers the dynamic favicons
  const todaysDate = dayjs().get("date");
  res.locals.todaysDate = todaysDate;
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
