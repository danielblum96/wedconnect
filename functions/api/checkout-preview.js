// Nyilvános (auth NÉLKÜLI) végpont, ami a rendeléshez mentett elonezet-kepet
// (rendelesek.preview_kep BLOB) szolgálja ki PNG-ként - ezt hívja a Stripe
// szervere, amikor a Checkout oldal betölti a termékképet (product_data.images).
// Auth nélkül kell lennie, mert a Stripe nem küld session-cookie-t. Nem jelent
// új adatvédelmi kockázatot: ugyanazok a (nyilvános) nevek/dátum jelennek meg
// rajta, mint a [slug].js publikus esküvői oldalon, csak egy sorszámozott
// rendeles_id-vel elérve, nem a slug-gal.
export async function onRequestGet(context) {
  const { request, env } = context;
  const rendelesId = parseInt(new URL(request.url).searchParams.get("rendeles_id") || "", 10);
  if (!rendelesId) return new Response("Missing rendeles_id", { status: 400 });

  const row = await env.DB.prepare("SELECT preview_kep FROM rendelesek WHERE id = ?").bind(rendelesId).first();
  if (!row || !row.preview_kep || !row.preview_kep.length) return new Response("Not found", { status: 404 });

  // A D1 a BLOB oszlopot .first()-nél sima JS Array-ként (byte-értékek
  // tömbjeként) adja vissza, NEM ArrayBuffer/Uint8Array-ként - a Response
  // csendben üres body-t ad, ha ezt közvetlenül próbáljuk body-ként átadni.
  return new Response(new Uint8Array(row.preview_kep), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
