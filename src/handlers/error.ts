import type { Request, Response, ErrorRequestHandler } from "express";

function notFound(req: Request, res: Response) {
  res.statusCode = 404;
  res.render("404");
}

const serverError: ErrorRequestHandler = (err, req, res, next) => {
  console.error(err);
  // TODO: If development mode, show stack trace in view
  res.status(500);
  res.render("error");
};

export const error = {
  notFound,
  serverError,
};
