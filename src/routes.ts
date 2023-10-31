import type { Express } from "express";

import { home } from "./controllers/home.js";
import { privacyPolicy } from "./controllers/privacy-policy.js";
import { signInPage } from "./controllers/sign-in.js";
import { signOut } from "./controllers/sign-out.js";
import { signUpPage, signUpForm } from "./controllers/sign-up.js";
import { activate } from "./controllers/activate.js";
import {
  getCalendar,
  redirectToLatestCalendar,
} from "./controllers/calendar.js";
import { removeDay, submitDay } from "./controllers/day.js";
import { errorTest } from "./controllers/error.js";

import {
  protect,
  emailPassSignIn,
  googleAuthenticate,
  googleSignIn,
  signInLimiter,
  signUpLimiter,
} from "./middleware/auth.js";

export function addRoutes(app: Express) {
  app.get("/", home);
  app.get("/privacy-policy", privacyPolicy);

  app.get("/oauth2/redirect/google", googleAuthenticate);
  app.get("/signin/federated/google", googleSignIn);
  app.get("/signin", signInPage);
  app.post("/signin", signInLimiter, emailPassSignIn);
  app.post("/signout", protect, signOut);
  app.get("/signup", signUpPage);
  app.post("/signup", signUpLimiter, signUpForm);
  app.get("/activate/:token", activate);

  app.get("/calendar/:year", protect, getCalendar);
  app.get("/calendar", protect, redirectToLatestCalendar);
  app.post("/day", protect, submitDay);
  app.delete("/day", protect, removeDay);

  app.get("/error-test", errorTest);
}
