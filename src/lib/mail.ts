import nodemailer from "nodemailer";
import { ENV } from "../lib/environment.js";

const transporter = nodemailer.createTransport({
  host: ENV.EMAIL_HOST,
  port: ENV.EMAIL_PORT,
  secure: ENV.DEPLOYMENT === "prod",
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
    from: '"Daily Do It" <support@dailydoit.online>',
    to,
    subject,
    html,
  });
}

export const mail = {
  send,
};
