import { randomBytes, pbkdf2, timingSafeEqual } from "crypto";

export async function hashPassword(
  plainPassword: string,
): Promise<{ hashedPassword: string; salt: string }> {
  const saltPromise = new Promise<Buffer>((resolve, reject) => {
    randomBytes(16, (err, buf) => {
      if (err) return reject(err);
      resolve(buf);
    });
  });

  const salt = await saltPromise;

  const hashedPasswordPromise = new Promise<Buffer>((resolve, reject) => {
    pbkdf2(plainPassword, salt, 600_000, 32, "sha256", (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey);
    });
  });

  const hashedPassword = await hashedPasswordPromise;

  return {
    hashedPassword: hashedPassword.toString("hex"),
    salt: salt.toString("hex"),
  };
}

export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string,
  saltAsHexString: string,
): Promise<Boolean> {
  const salt = Buffer.from(saltAsHexString, "hex");
  return new Promise((resolve, reject) => {
    pbkdf2(plainPassword, salt, 600_000, 32, "sha256", (err, derivedKey) => {
      if (err) return reject(err);
      const hash = Buffer.from(hashedPassword, "hex");
      if (timingSafeEqual(hash, derivedKey)) {
        return resolve(true);
      }
      return resolve(false);
    });
  });
}
