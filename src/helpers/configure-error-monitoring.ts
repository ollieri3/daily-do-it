import * as Sentry from "@sentry/node";

import { ENV } from "../lib/environment.js";

export function configureErrorMonitoring() {
  Sentry.init({
    dsn: ENV.SENTRY_DSN,
    enabled: ENV.DEPLOYMENT === "prod",
    environment: ENV.DEPLOYMENT,
  });

  if (ENV.DEPLOYMENT === "prod") {
    process.on("uncaughtException", (err) => {
      console.error(err.stack);
      Sentry.captureException(err);
      process.exit(1);
    });
  }
}
