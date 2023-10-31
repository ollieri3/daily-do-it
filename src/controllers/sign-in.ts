import type { Request, Response } from "express";

export function signInPage(req: Request, res: Response) {
  let errors;
  if ("messages" in req.session && (req.session.messages as []).length > 0) {
    errors = (req.session.messages as []).pop();
  }
  if (req.user) {
    return res.redirect("/");
  }
  res.render("signin", { errors });
}
