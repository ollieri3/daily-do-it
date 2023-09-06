import z from "zod";

export const emailSchema = z
  .string()
  .trim()
  .email({ message: "Please enter a valid email address" })
  .max(254);

export const passwordSchema = z
  .string()
  .min(8, {
    message: "Password must be at least 8 characters long",
  })
  .max(64, {
    message: "Password must be less than 64 characters long",
  });
