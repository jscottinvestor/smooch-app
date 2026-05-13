const SALT = ":smooch-auth-v1";

/** Hash a password into the cookie value (Edge-runtime compatible). */
export async function hashPassword(pw: string): Promise<string> {
  const data = new TextEncoder().encode(pw + SALT);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const AUTH_COOKIE = "smooch_auth";
