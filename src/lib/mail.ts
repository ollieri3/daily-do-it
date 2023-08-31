import nodemailer from "nodemailer";
import { ENV } from "../lib/environment.js";

const transporter = nodemailer.createTransport({
  host: ENV.EMAIL_HOST,
  port: ENV.EMAIL_PORT,
  secure: true,
  auth: {
    user: ENV.EMAIL_USER,
    pass: ENV.EMAIL_PASSWORD,
  },
});

//TODO: Extract this, it's too specific for a lib file
async function sendAccountConfirmationEmail(accountEmail: string) {
  try {
    const result = await transporter.sendMail({
      from: '"Daily Do It" <support@dailydoit.online>',
      to: accountEmail,
      subject: "Confirm your Daily Do It account",
      text: "Hello this is a test email, please confirm your account",
    });
    console.log("Email sent successfully");
  } catch (err) {
    console.error(err);
  }
}

export const mail = {
  transporter,
  sendAccountConfirmationEmail,
};
