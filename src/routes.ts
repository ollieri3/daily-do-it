import type { Express } from "express";

import { main } from "./handlers/main.js";
import { auth, signInLimiter, signUpLimiter } from "./handlers/auth.js";
import { calendar } from "./handlers/calendar.js";
import { error } from "./handlers/error.js";

import { isAuthenticated } from "./middleware/auth.js";

export function addRoutes(app: Express) {
  app.get("/", main.home);

  app.get("/oauth2/redirect/google", auth.googleSignInRedirect);
  app.get("/signin/federated/google", auth.googleSignIn);
  app.get("/signin", auth.signIn);
  app.post("/signin", signInLimiter, auth.handleSignIn);
  app.post("/signout", isAuthenticated, auth.handleSignOut);
  app.get("/signup", auth.signUp);
  app.post("/signup", signUpLimiter, auth.handleSignUp);
  app.get("/activate/:token", auth.activate);

  app.get("/calendar/:year", isAuthenticated, calendar.getCalendar);
  app.get("/calendar", isAuthenticated, calendar.home);
  app.post("/day", isAuthenticated, calendar.submitDay);
  app.delete("/day", isAuthenticated, calendar.removeDay);

  app.use(error.notFound);
  app.use(error.serverError);
}
