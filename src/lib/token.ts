import { randomBytes } from "crypto";
import dayjs from "dayjs";

export async function createActivationToken(): Promise<{
  value: string;
  expires: string;
}> {
  const tokenPromise = new Promise<Buffer>((resolve, reject) => {
    randomBytes(16, (err, buf) => {
      if (err) return reject(err);
      resolve(buf);
    });
  });
  const tokenBuffer = await tokenPromise;
  return {
    value: tokenBuffer.toString("hex"),
    expires: dayjs().add(2, "days").toISOString(),
  };
}

export const token = {
  createActivationToken,
};
