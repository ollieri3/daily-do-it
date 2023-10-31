import type { Request, Response } from "express";

export function privacyPolicy(_: Request, res: Response) {
  return res.render("privacy-policy");
}