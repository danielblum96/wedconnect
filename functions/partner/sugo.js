import { getSessionReseller, dashboardHref } from "../_utils/auth.js";
import { escapeHtml } from "../_utils/html.js";
import { getResellerCopy } from "../_utils/i18n.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  const reseller = await getSessionReseller(request, env.DB);
  if (!reseller) return Response.redirect(new URL("/partner/login", request.url).href, 303);
  if (reseller.fiok_tipus === "maganszemely") return Response.redirect(new URL("/sajat/sugo", request.url).href, 303);
  return renderSugo(context, reseller);
}

// Ld. functions/partner/dashboard.js renderDashboard()-jának ugyanilyen
// megjegyzését - a /sajat/sugo (functions/sajat/sugo.js) ezt hívja meg.
export async function renderSugo(context, reseller) {
  const { request } = context;
  const brandSuffix = reseller.fiok_tipus === "maganszemely" ? "" : " Partner";
  const lang = reseller.nyelv || "de";
  const copy = getResellerCopy(lang);
  const t = copy.help;

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(t.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root { --bg:#faf7f2; --fg:#2b2620; --muted:#7a7266; --accent:#b48b56; --card:#ffffff; }
  * { box-sizing: border-box; }
  body { margin:0; font-family:"Poppins",sans-serif; background:var(--bg); color:var(--fg); }
  header { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px 16px; padding:20px 32px; background:var(--card); box-shadow:0 2px 10px rgba(0,0,0,0.05); }
  .brand { font-family:"Cormorant Garamond",serif; font-weight:600; font-size:1.4rem; }
  .brand span { color:var(--accent); }
  .who { font-size:0.95rem; color:var(--muted); }
  .back-link { font-size:0.95rem; color:var(--muted); text-decoration:underline; }
  .logout-form button { border:none; background:none; color:var(--muted); text-decoration:underline; cursor:pointer; font-family:inherit; font-size:0.95rem; }
  @media (max-width: 600px) {
    header { padding:14px 16px; }
    .who { display:none; }
  }
  main { max-width:640px; margin:0 auto; padding:36px 24px 80px; }
  h1 { font-family:"Cormorant Garamond",serif; font-size:2rem; margin:0 0 8px; }
  .intro { color:var(--muted); font-size:1rem; margin:0 0 30px; line-height:1.5; }
  h2 { font-family:"Cormorant Garamond",serif; font-size:1.4rem; margin:0 0 16px; }
  .steps { list-style:none; margin:0 0 40px; padding:0; counter-reset:none; }
  .step { background:var(--card); border-radius:14px; padding:18px 22px; margin-bottom:12px; box-shadow:0 6px 20px -16px rgba(0,0,0,0.15); }
  .step-title { font-weight:600; font-size:1.02rem; margin:0 0 6px; }
  .step-text { color:var(--muted); font-size:0.94rem; line-height:1.55; margin:0; }
  .faq { background:var(--card); border-radius:14px; box-shadow:0 6px 20px -16px rgba(0,0,0,0.15); overflow:hidden; }
  .faq details { border-bottom:1px solid #f0e9d8; }
  .faq details:last-child { border-bottom:none; }
  .faq summary { padding:16px 22px; font-weight:600; font-size:0.98rem; cursor:pointer; list-style:none; display:flex; align-items:center; justify-content:space-between; gap:12px; }
  .faq summary::-webkit-details-marker { display:none; }
  .faq summary::after { content:"+"; flex:none; font-size:1.3rem; font-weight:400; color:var(--accent); transition:transform 0.15s ease; }
  .faq details[open] summary::after { transform:rotate(45deg); }
  .faq summary:hover { background:#faf6ee; }
  .faq-answer { padding:0 22px 18px; color:var(--muted); font-size:0.94rem; line-height:1.6; margin:0; }
  .faq-answer a { color:var(--accent); }
</style>
</head>
<body>
<header>
  <div class="brand">Wed<span>Connect</span>${brandSuffix}</div>
  <div style="display:flex; align-items:center; gap:16px;">
    <span class="who">${escapeHtml(reseller.ceg_nev)} (${escapeHtml(reseller.email)})</span>
    <a class="back-link" href="${dashboardHref(reseller.fiok_tipus)}">${escapeHtml(t.backToDashboard)}</a>
    <form class="logout-form" method="POST" action="/api/reseller-logout"><button type="submit">${escapeHtml(t.logout)}</button></form>
  </div>
</header>
<main>
  <h1>${escapeHtml(t.heading)}</h1>
  <p class="intro">${escapeHtml(t.intro)}</p>
  <ol class="steps">
    ${t.steps
      .map(
        (s) => `<li class="step"><p class="step-title">${escapeHtml(s.title)}</p><p class="step-text">${escapeHtml(s.text)}</p></li>`
      )
      .join("")}
  </ol>
  <h2>${escapeHtml(t.faqHeading)}</h2>
  <div class="faq">
    ${t.faq
      .map(
        (f) => `<details><summary>${escapeHtml(f.q)}</summary><p class="faq-answer">${escapeHtml(f.a)}</p></details>`
      )
      .join("")}
  </div>
</main>
</body>
</html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
