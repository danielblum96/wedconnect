// A gyökér domain (wedconnect.eu) böngésző-nyelv alapján irányít át a
// megfelelő nyelvű főoldalra. Az angol nyelvnek egyelőre nincs saját
// bemutató-főoldala (csak /en/register), ezért az alapértelmezett eset
// (sem hu, sem de nem szerepel a fejlécben) a némethez irányít.
function pickLang(acceptLanguage) {
  const langs = (acceptLanguage || "")
    .split(",")
    .map((part) => {
      const [tag, qPart] = part.trim().split(";");
      const q = qPart ? parseFloat(qPart.split("=")[1]) || 0 : 1;
      return { primary: (tag || "").split("-")[0].toLowerCase(), q };
    })
    .sort((a, b) => b.q - a.q);
  for (const l of langs) {
    if (l.primary === "hu") return "hu";
    if (l.primary === "de") return "de";
  }
  return null;
}

export async function onRequestGet(context) {
  const { request } = context;
  const lang = pickLang(request.headers.get("Accept-Language"));
  const target = lang === "hu" ? "/hu/" : "/de/";
  return Response.redirect(new URL(target, request.url).href, 302);
}
