import { mail } from "../lib/mail.js";
import { ENV } from "../lib/environment.js";
import fs from "fs/promises";
import handlebars from "handlebars";

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
  const host = ENV.DEPLOYMENT === "dev" ? "localhost:8000" : "dailydoit.online";
  const activateURL = `${protocol}://${host}/activate/${token}`;
  await mail.send({
    to: accountEmail,
    subject,
    html: template({ subject, activateURL }),
  });
}

export const user = {
  sendAccountConfirmationEmail,
};
