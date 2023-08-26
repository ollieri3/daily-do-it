import type { Request, Response, NextFunction } from "express";

export function isAuthenticated(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  return req.user ? next() : res.redirect("/signin");
}
