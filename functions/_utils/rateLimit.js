// Egyszerű, csúszó-ablakos rate limiting Cloudflare KV-vel. Minden hívás
// növeli a számlálót és FRISSÍTI a lejáratot `windowSeconds`-ra a mostani
// pillanattól számítva - ez szándékosan csúszó (nem fix) ablak: egy
// folyamatosan próbálkozó támadó saját magát tartja lezárva, minden újabb
// próbálkozás meghosszabbítja a tiltás idejét.
export async function checkRateLimit(env, key, limit, windowSeconds) {
  const raw = await env.RATE_LIMIT.get(key);
  const count = raw ? parseInt(raw, 10) : 0;
  if (count >= limit) return false;
  await env.RATE_LIMIT.put(key, String(count + 1), { expirationTtl: windowSeconds });
  return true;
}

export function clientIp(request) {
  return request.headers.get("CF-Connecting-IP") || "unknown";
}
