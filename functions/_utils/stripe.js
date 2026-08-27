// Stripe API-hívások közvetlenül a REST API-n (https://api.stripe.com) keresztül,
// fetch-csel - a Cloudflare Pages Direct Upload projekttípusnál nincs npm/bundler,
// ezért a hivatalos "stripe" csomagot nem lehet importálni, ugyanaz a minta, mint
// a mailer.js-nél (Resend). A titkos kulcsot a STRIPE_SECRET_KEY Cloudflare
// Pages secret tárolja.

const STRIPE_API_BASE = "https://api.stripe.com/v1";

// A Stripe API form-urlencoded testet vár, zárójeles jelöléssel a beágyazott
// objektumokhoz/tömbökhöz (pl. line_items[0][price_data][currency]=eur).
function toFormBody(params) {
  const pairs = [];
  function walk(value, path) {
    if (value === null || value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach((item, i) => walk(item, `${path}[${i}]`));
    } else if (typeof value === "object") {
      Object.entries(value).forEach(([key, v]) => walk(v, path ? `${path}[${key}]` : key));
    } else {
      pairs.push(`${encodeURIComponent(path)}=${encodeURIComponent(value)}`);
    }
  }
  Object.entries(params).forEach(([key, value]) => walk(value, key));
  return pairs.join("&");
}

async function stripeRequest(env, method, path, params) {
  if (!env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY nincs beállítva.");
  const res = await fetch(`${STRIPE_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params ? toFormBody(params) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Stripe API hiba (${path}): ${data.error ? data.error.message : res.status}`);
  }
  return data;
}

// A jelenleg használt két pénznem (EUR, HUF) mindkettő 2 tizedesjegyű a
// Stripe terhelési (charge/Checkout) API-jában - a "HUF zero-decimal" infó
// csak a kifizetésekre (payout) vonatkozik, a terhelésre NEM. Ha valaha
// tényleges zero-decimal pénznem (pl. JPY) kerülne be, itt kell kivételt tenni.
export function toStripeAmount(amount) {
  return Math.round(amount * 100);
}

export async function createCheckoutSession(env, { currency, amount, productName, successUrl, cancelUrl, metadata, customerEmail }) {
  return stripeRequest(env, "POST", "/checkout/sessions", {
    mode: "payment",
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: customerEmail || undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: toStripeAmount(amount),
          product_data: { name: productName },
        },
      },
    ],
    metadata,
  });
}

export async function retrieveCheckoutSession(env, sessionId) {
  return stripeRequest(env, "GET", `/checkout/sessions/${encodeURIComponent(sessionId)}`);
}

export async function createWebhookEndpoint(env, url) {
  return stripeRequest(env, "POST", "/webhook_endpoints", {
    url,
    enabled_events: ["checkout.session.completed"],
  });
}

function bufToHex(buf) {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// A Stripe-webhook aláírás-ellenőrzése (Stripe-Signature fejléc: "t=...,v1=...")
// Web Crypto-val, ugyanaz a HMAC-mintázat, mint amit a projekt már használ
// (ld. _utils/auth.js PBKDF2 jelszó-hasheléshez).
export async function verifyStripeSignature(rawBody, sigHeader, secret) {
  if (!sigHeader) return false;
  const parts = {};
  sigHeader.split(",").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx === -1) return;
    parts[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
  });
  const timestamp = parts.t;
  const expectedSig = parts.v1;
  if (!timestamp || !expectedSig) return false;

  // 5 perces tolerancia a replay-támadások ellen (a Stripe hivatalos ajánlása).
  const age = Date.now() / 1000 - parseInt(timestamp, 10);
  if (isNaN(age) || age > 300 || age < -300) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(`${timestamp}.${rawBody}`));
  const computedSig = bufToHex(sigBuf);

  if (computedSig.length !== expectedSig.length) return false;
  let diff = 0;
  for (let i = 0; i < computedSig.length; i++) diff |= computedSig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
  return diff === 0;
}
