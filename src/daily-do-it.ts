import express, { ErrorRequestHandler, RequestHandler } from "express";
import { engine } from "express-handlebars";
import { fileURLToPath } from "url";
import { getPortPromise as getPort } from "portfinder";
import { randomBytes, pbkdf2, timingSafeEqual } from "crypto";
import pg from "pg";
import { Strategy as LocalStrategy } from "passport-local";
import passport from "passport";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import dayjs from "dayjs";
import localeData from "dayjs/plugin/localeData.js";
import bodyParser from "body-parser";
import csrf from "csrf";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import z from "zod";
import validator from "validator";

import { ENV } from "./lib/environment.js";
import { notFound } from "./lib/handlers.js";

const Tokens = new csrf();

dayjs.extend(localeData);

const pgSession = connectPgSimple(session);

const pool = new pg.Pool({
  user: ENV.DB_USER,
  host: ENV.DB_HOST,
  database: "dailydoit",
  password: ENV.DB_PASSWORD,
  port: ENV.DB_PORT,
});

const port = await getPort();

const isAuthenticated: RequestHandler = (req, res, next) => {
  return req.user ? next() : res.redirect("/signin");
};

const app = express();

app.use(helmet());

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
    proxy: ENV.DEPLOYMENT === "prod" ? true : undefined,
    store: new pgSession({
      pool,
      createTableIfMissing: true,
    }),
    secret: ENV.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: ENV.DEPLOYMENT === "prod",
      sameSite: true,
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
    const secret = await Tokens.secret();
    return cb(null, { id: user.id, email: user.email });
  });
});

passport.deserializeUser((user: any, cb) => {
  process.nextTick(() => {
    return cb(null, user);
  });
});

// Provide user to all templates
app.use((req, res, next) => {
  if (req.user) res.locals.user = req.user;
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

// Routes
app.get("/", (req, res) => {
  if (req.user) {
    res.redirect("/calendar");
    return;
  }
  res.render("home", {
    username: (req.user as any)?.email,
  });
});

app.get("/signin", (req, res) => {
  let errors;
  if ("messages" in req.session && (req.session.messages as []).length > 0) {
    errors = (req.session.messages as []).pop();
  }
  if (req.user) {
    res.redirect("/");
  }
  res.render("signin", { errors });
});

// Sign in Rate limiting
const signInLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.post(
  "/signin",
  signInLimiter,
  passport.authenticate("local", {
    session: true,
    successRedirect: "/calendar",
    failureRedirect: "/signin",
    failureMessage: true,
  }),
);

// TODO: Re-enable this later
// app.get("/signup", (req, res) => {
//   res.render("signup");
// });

app.post("/signup", (req, res, next) => {
  const salt = randomBytes(16);
  pbkdf2(
    req.body.password,
    salt,
    600_000,
    32,
    "sha256",
    async (err, derivedKey) => {
      if (err) return next(err);
      const hashedPassword = derivedKey.toString("hex");
      const saltString = salt.toString("hex");
      try {
        await pool.query(
          `INSERT INTO users(email, hashed_password, salt) VALUES($1, $2, $3) RETURNING email`,
          [req.body.email, hashedPassword, saltString],
        );
      } catch (err) {
        return next(err);
      }
      res.redirect("/");
    },
  );
});

app.post("/signout", isAuthenticated, (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect("/");
  });
});

// Calendar Routes

app.post("/day", isAuthenticated, async (req, res) => {
  // TODO: Setup some zod input validation here.

  if (dayjs(req.body.date).isValid() === false) {
    res.statusCode = 422;
    res.send({
      success: false,
      message: "Invalid date format provided for 'day'",
    });
    return;
  }

  // First check if an entry already exists on that day
  const existingEntryRows = await pool.query(
    `
    SELECT id FROM days WHERE date = $1 AND user_id = $2
  `,
    [req.body.date, (req.user as any).id],
  );

  if (existingEntryRows.rows.length > 0) {
    res.statusCode = 500;
    res.send({ success: false, message: "Date entry already exists" });
    return;
  }

  // Insert it
  const rows = await pool.query(
    `
    INSERT INTO days (user_id, date) VALUES ($1, $2)
  `,
    [(req.user as any).id, req.body.date],
  );

  res.json({ success: true });
});

app.delete("/day", isAuthenticated, async (req, res) => {
  // TODO: Extract and share this
  if (dayjs(req.body.date).isValid() === false) {
    res.statusCode = 422;
    res.send({
      success: false,
      message: "Invalid date format provided for 'day'",
    });
    return;
  }

  const existingEntryRows = await pool.query(
    `
    DELETE FROM days WHERE date = $1 AND user_id = $2
  `,
    [req.body.date, (req.user as any).id],
  );

  if (existingEntryRows.rows.length > 0) {
    res.json({ success: true, message: "Day removed" });
    return;
  }

  res.json({ success: false });
  return;
});

app.get("/calendar/:year", isAuthenticated, async (req, res) => {
  // TODO: Add authentication/redirect middleware for pages that require authentication

  // Query all days in year for current user
  const { rows: userDays } = await pool.query(
    `SELECT id, date FROM days WHERE user_id = $1`,
    [(req.user as any).id],
  );

  const months = dayjs.monthsShort().map((month, index) => {
    const monthDate = dayjs(new Date(+req.params.year, index));
    const numberOfDays = monthDate.daysInMonth();
    return {
      month,
      days: [...Array(numberOfDays).keys()].map((i) => {
        return {
          day: i + 1,
          date: monthDate.date(i + 1).format("YYYY-MM-DD"),
          isComplete: userDays.some((day) =>
            dayjs(day.date).isSame(monthDate.date(i + 1)),
          ),
        };
      }),
    };
  });
  res.render("calendar", { months });
});

app.get("/calendar", isAuthenticated, (req, res) => {
  res.redirect(`/calendar/${new Date().getFullYear()}`);
});

// 404 Not Found Route
app.use(notFound);

const ErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.error(err);
  // TODO: If development mode, show stack trace in view
  res.status(500);
  res.render("error");
};

// Error middleware
app.use(ErrorHandler);

app.listen(port, () =>
  console.log(
    `Express started on http://localhost:${port} \n` +
      `Press Ctrl-C to terminate`,
  ),
);
