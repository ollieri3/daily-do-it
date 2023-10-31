import session from "express-session";
import connectPgSimple from "connect-pg-simple";

import { ENV } from "../lib/environment.js";
import { pool } from "../lib/db.js";

const pgSession = connectPgSimple(session);

export const sessionMiddleware = session({
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
});
