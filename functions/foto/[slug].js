// A pár borítóképét szolgálja ki az R2-ből ("parok/{slug}.webp") - külön
// route, hogy ne kelljen az R2 bucket-et nyilvánosan (saját domain-nel)
// kiexponálni, a meglévő Pages Functions app-on belül marad minden.
export async function onRequestGet(context) {
  const { params, env } = context;
  const slug = params.slug;
  if (!slug || Array.isArray(slug)) return new Response("Not found", { status: 404 });

  const object = await env.PHOTOS.get(`parok/${slug}.webp`);
  if (!object) return new Response("Not found", { status: 404 });

  return new Response(object.body, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=3600",
      // A böngésző MINDIG image/webp-ként kezelje ezt a választ, sose próbálja
      // a tartalom alapján "kitalálni" a típust (pl. HTML-ként értelmezni egy
      // rosszindulatú feltöltést) - védelem a content-type sniffing ellen.
      "X-Content-Type-Options": "nosniff",
    },
  });
}
