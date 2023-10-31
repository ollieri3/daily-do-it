import type { Request, Response, ErrorRequestHandler } from "express";

import { ENV } from "../lib/environment.js";

export function notFound(req: Request, res: Response) {
  res.statusCode = 404;
  res.render("404");
}

export const serverError: ErrorRequestHandler = (error, req, res, next) => {
  console.error(error);  
  res.status(500);

  if (ENV.DEPLOYMENT === "dev") {
    return res.render("error", {
      // Only show stack trace in dev
      errorId: "sentry" in res ? res.sentry : undefined,
      stack: error instanceof Error ? error.stack : undefined
    });
  } else {
    return res.render("error", {
      errorId: "sentry" in res ? res.sentry : undefined,
      error: error instanceof Error ? error.message : error,
    });
  }
};
