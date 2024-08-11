import * as Sentry from "@sentry/node";
import fs from "fs/promises";
import handlebars from "handlebars";

import { ENV } from "./environment.js";
import { mail } from "./mail.js";

async function onSignup(): Promise<void> {
  try {
    await mail.sendPlain({
      to: ENV.NOTIFICATION_EMAIL,
      subject: "New Signup!",
      text: `A new user has signed up for Daily Do It!`,
    });
  } catch (err) {
    console.error(err);
    Sentry.captureException(err);
  }
}

async function sendAccountConfirmationEmail(
  accountEmail: string,
  token: string,
) {
  const templatePath = new URL(
    "../views/email/confirm-account.handlebars",
    import.meta.url,
  );
  const templateFile = await fs.readFile(templatePath, { encoding: "utf-8" });
  const template = handlebars.compile(templateFile);

  const subject = "Confirm your Daily Do It account";
  const protocol = ENV.DEPLOYMENT === "dev" ? "http" : "https";
  const host =
    ENV.DEPLOYMENT === "dev" ? "localhost:8000" : "habits.olivers.cloud";
  const activateURL = `${protocol}://${host}/activate/${token}`;
  await mail.send({
    to: accountEmail,
    subject,
    html: template({ subject, activateURL }),
  });
}

export const notify = {
  onSignup,
  sendAccountConfirmationEmail,
};
