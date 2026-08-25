function bufToHex(buf) {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBuf(hex) {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.substr(i * 2, 2), 16);
  return arr;
}

async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256
  );
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await deriveKey(password, salt);
  return `${bufToHex(salt)}:${bufToHex(bits)}`;
}

export async function verifyPassword(password, stored) {
  const [saltHex, hashHex] = (stored || "").split(":");
  if (!saltHex || !hashHex) return false;
  const salt = hexToBuf(saltHex);
  const bits = await deriveKey(password, salt);
  const candidate = bufToHex(bits);
  if (candidate.length !== hashHex.length) return false;
  let diff = 0;
  for (let i = 0; i < candidate.length; i++) diff |= candidate.charCodeAt(i) ^ hashHex.charCodeAt(i);
  return diff === 0;
}

export function newSessionToken() {
  return bufToHex(crypto.getRandomValues(new Uint8Array(32)));
}

export function parseCookies(request) {
  const header = request.headers.get("Cookie") || "";
  const out = {};
  header.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx === -1) return;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  });
  return out;
}

export async function getSessionReseller(request, db) {
  const cookies = parseCookies(request);
  const token = cookies["wc_session"];
  if (!token) return null;
  const row = await db
    .prepare("SELECT s.viszontelado_id as id, s.lejar, v.ceg_nev, v.email, v.orszag, v.nyelv FROM sessions s JOIN viszontelado v ON v.id = s.viszontelado_id WHERE s.token = ?")
    .bind(token)
    .first();
  if (!row) return null;
  if (new Date(row.lejar).getTime() < Date.now()) return null;
  return row;
}

export function sessionCookie(token, maxAgeSeconds) {
  return `wc_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}`;
}

export function clearSessionCookie() {
  return "wc_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0";
}
