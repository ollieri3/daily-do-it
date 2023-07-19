import express from "express";
import { engine } from "express-handlebars";
import { fileURLToPath } from "url";
import { getPortPromise as getPort } from "portfinder";
import { randomBytes, pbkdf2, timingSafeEqual } from "crypto";
import pg from "pg";
import { Strategy as LocalStrategy } from "passport-local";
import passport from "passport";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";

import { notFound } from "./lib/handlers.js";

const pgSession = connectPgSimple(session);

const pool = new pg.Pool({
  user: "postgres",
  host: "localhost",
  database: "dailydoit",
  password: "secret", // This will be changed before deployment
  port: 5432
});

const port = await getPort();

const app = express();

// Don't tell clients that the server is powered by Express
app.disable("x-powered-by");

app.engine('handlebars', engine({
  defaultLayout: "main"
}));
app.set("view engine", "handlebars");

app.set("views", fileURLToPath( new URL('.', import.meta.url) + 'views'));

// Enable reading of URL Encoded Requst bodies
app.use(express.urlencoded());

app.use(session({
  store: new pgSession({
    pool,
    createTableIfMissing: true
  }),
  secret: "supersecret", // change this before deployment
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // TODO: Set this to False when deployed
    sameSite: true
  }
}));
app.use(passport.authenticate('session'));

// Passport Setup
passport.use('local', new LocalStrategy( async function verify(email, password, cb) {
  const { rows } = await pool.query(`SELECT email, salt, hashed_password FROM users WHERE email = $1`, [email]);
  const row = rows[0];

  if (!row) {
    console.log("User doesn't exist");
    return cb(null, false, {message: 'Incorrect username or password.'});
  }

  const salt = Buffer.from(row.salt, "hex");
  pbkdf2(password, salt, 600_000, 32, 'sha256', (err, derivedKey) => {
    if(err) return cb(err);
    const hash = Buffer.from(row.hashed_password, "hex");
    if(!timingSafeEqual(hash, derivedKey)) {
      return cb(null, false, {message: 'Incorrect username or password'});
    }
    return cb(null, row);
  });
}));

passport.serializeUser((user: any, cb) => {
  process.nextTick(() => {
    return cb(null, { id: "todo", email: user.email });
  })
});

passport.deserializeUser((user: any, cb) => {
  process.nextTick(() => {
    return cb(null, user);
  })
})

// Routes

app.get("/", (req, res) => {
  res.render("home", {
    username: (req.user as any)?.email
  })
})

app.get("/signin", (req, res) => {
  res.render("signin");
});

app.post('/signin', passport.authenticate('local', {
  session: true,
  successRedirect: "/calendar",
  failureRedirect: "/signin"
}));

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.post("/signup", (req, res, next) => {
  const salt = randomBytes(16);
  pbkdf2(req.body.password, salt, 600_000, 32, "sha256", async (err, derivedKey) => {
    if(err) return next(err);
    const hashedPassword = derivedKey.toString("hex");
    const saltString = salt.toString("hex")
    try {
      await pool.query(`INSERT INTO users(email, hashed_password, salt) VALUES($1, $2, $3) RETURNING email`,[
        req.body.email,
        hashedPassword,
        saltString
      ]);
    } catch (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.post("/signout", (req, res, next) => {
  req.logout((err) => {
    if(err) return next(err);
    res.redirect("/");
  })
});


// Calendar Routes

app.get("/calendar/:year", (req, res) => {
  console.log("params", req.params.year);
  res.contentType("text/html");
  res.send("Calendar for " + req.params.year);
})


app.get("/calendar", (req, res) => {
  res.redirect(`/calendar/${new Date().getFullYear()}`);
});

// 404 Not Found Route
app.use(notFound);

app.listen(port, () => console.log(
  `Express started on http://localhost:${port} \n` +
  `Press Ctrl-C to terminate`
));
