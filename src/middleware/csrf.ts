import csrf from "csrf";
import type { Request, Response, NextFunction } from "express";

const Tokens = new csrf();

export function provideCSRFTokenMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const csrfSecret = Tokens.secretSync();
  if (!(req.session as any).csrfSecret) {
    (req.session as any).csrfSecret = csrfSecret;
  }
  if (!(req.session as any).csrfToken) {
    (req.session as any).csrfToken = Tokens.create(csrfSecret);
  }
  res.locals._csrfToken = (req.session as any).csrfToken;
  next();
}

export function validateCSRFMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const ignoredMethods = ["GET", "HEAD", "OPTIONS"];
  if (ignoredMethods.includes(req.method)) {
    return next();
  }

  const clientToken = req.body._csrf || req.headers["x-csrf-token"];
  if (!clientToken) {
    res.status(403).send("No CSRF token provided");
    return;
  }
  const userCsrfSecret = (req.session as any).csrfSecret;
  if (!Tokens.verify(userCsrfSecret, clientToken)) {
    res.status(403).send("Invalid csrf token");
    return;
  }
  // Continue as normal
  next();
}
