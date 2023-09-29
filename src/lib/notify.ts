import * as Sentry from "@sentry/node";

import { ENV } from "./environment.js";
import { mail } from "./mail.js";

async function onSignup(): Promise<void> {
  try {
    await mail.sendPlain({
      to: ENV.NOTIFICATION_EMAIL,
      subject: "New Signup!",
      text: `A new user has signed up for Daily Do It!`,
    })
  } catch (err) {
    console.log("err: ", err);
    Sentry.captureException(err);
  }
}

export const notify = {
  onSignup,
}