import { RequestHandler } from "express";

export const notFound: RequestHandler = (req, res) => {
  res.statusCode = 404;
  res.render("404");
};
