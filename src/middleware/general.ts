import type { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import dayjs from "dayjs";
import { ENV } from "../lib/environment.js";
import expressSitemapXML from "express-sitemap-xml";

export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      "img-src": ["'self'", "data:", "img.shields.io"], // Allow img.shields.io for footer badges
      "script-src": ["'self'"],
      "connect-src": ["'self'"],
    },
  },
});

export function templateGlobalsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Provide user info to templates
  if (req.user) res.locals.user = req.user;

  // Powers the dynamic favicons set in main template
  const todaysDate = dayjs().get("date");
  res.locals.todaysDate = todaysDate;

  // Determine whether to initiate analytics
  res.locals.enableAnalytics = ENV.DEPLOYMENT === "prod";

  // Provide flash messages to templates
  if (req.session.flash) {
    res.locals.flash = req.session.flash;
    delete req.session.flash;
  }
  next();
}

export const sitemapMiddleware = expressSitemapXML(() => {
  return ["/", "/signin", "/signup", "/privacy-policy"];
}, "https://habits.olivers.cloud");
