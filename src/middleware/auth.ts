import type { Request, Response, NextFunction } from "express";
import passport from "passport";
import rateLimit from "express-rate-limit";

import { ENV } from "../lib/environment.js";

/** Route level middleware to protect an authenticated route from
 * unauthenticated users
 */
export function protect(req: Request, res: Response, next: NextFunction) {
  return req.user ? next() : res.redirect("/signin");
}

export const signInLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1Hour
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => ENV.DEPLOYMENT === "dev",
});

export const signUpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1Hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => ENV.DEPLOYMENT === "dev",
});

export const googleAuthenticate = passport.authenticate("google", {
  session: true,
  failureRedirect: "/signin",
  successRedirect: "/calendar",
  passReqToCallback: true,
});

export const googleSignIn = passport.authenticate("google");

export const emailPassSignIn = passport.authenticate("local", {
  session: true,
  successRedirect: "/calendar",
  failureRedirect: "/signin",
  passReqToCallback: true,
});
