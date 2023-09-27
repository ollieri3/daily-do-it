import type { Request, Response, ErrorRequestHandler, NextFunction } from "express";
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

/**
 * This handler exists purely to test error handling.
 */
function errorTest(req: Request<{}, {}, {}, {async?: "true" | "false"}>, res: Response, next: NextFunction) {
  if(req.query.async === "true") {
    return process.nextTick(() => {
      next(new Error("This is a test async error"));
    })
  }
  throw new Error("This is a test error");
}

export const error = {
  notFound,
  serverError,
  errorTest
};
