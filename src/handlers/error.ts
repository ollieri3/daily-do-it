import type { Request, Response, ErrorRequestHandler } from "express";
import { ENV } from "../lib/environment.js";

function notFound(req: Request, res: Response) {
  res.statusCode = 404;
  res.render("404");
}

const serverError: ErrorRequestHandler = (error, req, res, next) => {
  console.error(error);
  res.status(500);

  if (ENV.DEPLOYMENT === "dev") {
    return res.render("error", {
      error: error instanceof Error ? error.toString() : error,
    });
  } else {
    return res.render("error");
  }
};

export const error = {
  notFound,
  serverError,
};
