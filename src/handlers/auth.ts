import type { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import passport from "passport";
import { randomBytes, pbkdf2 } from "crypto";
import { pool } from "../lib/db.js";

function signIn(req: Request, res: Response) {
  let errors;
  if ("messages" in req.session && (req.session.messages as []).length > 0) {
    errors = (req.session.messages as []).pop();
  }
  if (req.user) {
    return res.redirect("/");
  }
  res.render("signin", { errors });
}

export const signInLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

const handleSignIn = passport.authenticate("local", {
  session: true,
  successRedirect: "/calendar",
  failureRedirect: "/signin",
  failureMessage: true,
});

function signUp(req: Request, res: Response) {
  res.render("signup");
}

function handleSignUp(req: Request, res: Response, next: NextFunction) {
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
      return res.redirect("/");
    },
  );
}

function handleSignOut(req: Request, res: Response, next: NextFunction) {
  req.logout((err) => {
    if (err) return next(err);
    return res.redirect("/");
  });
}

export const auth = {
  signIn,
  handleSignIn,
  signUp,
  handleSignUp,
  handleSignOut,
};
