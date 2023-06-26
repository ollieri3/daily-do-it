import { RequestHandler } from "express";

export const notFound: RequestHandler = (req, res) => {
  res.render("404");
}