import type { Request, Response, NextFunction } from "express";

export function signOut(req: Request, res: Response, next: NextFunction) {
  req.logout((err) => {
    if (err) return next(err);
    return res.redirect("/");
  });
}
