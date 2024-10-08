import nodemailer from "nodemailer";
import { ENV } from "../lib/environment.js";

const transporter = nodemailer.createTransport({
  host: ENV.EMAIL_HOST,
  port: ENV.EMAIL_PORT,
  secure: false,
  logger: true,
  auth: {
    user: ENV.EMAIL_USER,
    pass: ENV.EMAIL_PASSWORD,
  },
});

type SendOptions = {
  to: string;
  subject: string;
  html: string;
};
async function send({ to, subject, html }: SendOptions) {
  await transporter.sendMail({
    from: '"Daily Do It" <dailydoit@olivers.cloud>',
    to,
    subject,
    html,
  });
}

type SendPlainOptions = {
  to: string;
  subject: string;
  text: string;
};
async function sendPlain({ to, subject, text }: SendPlainOptions) {
  await transporter.sendMail({
    from: '"Daily Do It" <dailydoit@olivers.cloud>',
    to,
    subject,
    text,
  });
}

export const mail = {
  send,
  sendPlain,
};
