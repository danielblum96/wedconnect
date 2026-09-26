// "A mi történetünk" állomás-fotó kiszolgálása az R2-ből (parok/<slug>/tortenet/<id>.webp).
export async function onRequestGet(context) {
  const { params, env } = context;
  const { slug, id } = params;
  if (!slug || Array.isArray(slug) || !/^[a-f0-9]{8}$/.test(id || "")) return new Response("Not found", { status: 404 });

  const object = await env.PHOTOS.get(`parok/${slug}/tortenet/${id}.webp`);
  if (!object) return new Response("Not found", { status: 404 });

  return new Response(object.body, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
