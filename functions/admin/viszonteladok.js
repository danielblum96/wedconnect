import { getAdminSession } from "../_utils/adminAuth.js";
import { escapeHtml } from "../_utils/html.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  const session = await getAdminSession(request, env.DB);
  if (!session) return Response.redirect(new URL("/admin/login", request.url).href, 303);

  const { results: viszontelado } = await env.DB.prepare(
    `SELECT v.id, v.ceg_nev, v.email, v.orszag, v.nyelv, v.allapot, v.letrehozva,
            (SELECT COUNT(*) FROM parok p WHERE p.viszontelado_id = v.id) AS parok_szama
     FROM viszontelado v
     ORDER BY v.letrehozva DESC`
  ).all();

  const rows = (viszontelado || [])
    .map((v) => {
      const isActive = v.allapot === "Aktív";
      return `
        <tr>
          <td>${escapeHtml((v.letrehozva || "").slice(0, 10))}</td>
          <td>${escapeHtml(v.ceg_nev)}</td>
          <td>${escapeHtml(v.email)}</td>
          <td>${escapeHtml(v.orszag || "—")}</td>
          <td>${escapeHtml((v.nyelv || "").toUpperCase())}</td>
          <td>${v.parok_szama}</td>
          <td><span class="badge ${isActive ? "badge-green" : "badge-red"}">${escapeHtml(v.allapot)}</span></td>
          <td>
            <form method="POST" action="/api/admin-toggle-reseller" onsubmit="return confirm('${
              isActive ? "Biztosan inaktiválja ezt a fiókot? A viszonteladó nem fog tudni bejelentkezni." : "Biztosan aktiválja ezt a fiókot?"
            }')">
              <input type="hidden" name="viszontelado_id" value="${v.id}">
              <input type="hidden" name="action" value="${isActive ? "deactivate" : "activate"}">
              <button type="submit" class="btn-small">${isActive ? "Inaktiválás" : "Aktiválás"}</button>
            </form>
          </td>
        </tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="hu">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>Admin — Viszonteladók</title>
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
  nav { display:flex; gap:18px; align-items:center; }
  nav a { color:var(--muted); text-decoration:underline; font-size:0.85rem; }
  nav a.active { color:var(--fg); font-weight:600; text-decoration:none; }
  .logout-form button { border:none; background:none; color:var(--muted); text-decoration:underline; cursor:pointer; font-family:inherit; font-size:0.85rem; }
  main { max-width:1200px; margin:0 auto; padding:36px 24px 80px; }
  h2 { font-family:"Cormorant Garamond",serif; font-size:1.5rem; margin:0 0 18px; }
  .stats-bar { display:flex; gap:16px; flex-wrap:wrap; margin-bottom:28px; }
  .stat { flex:1; min-width:180px; background:var(--card); border-radius:14px; padding:20px 22px; box-shadow:0 6px 20px -16px rgba(0,0,0,0.15); }
  .stat-value { font-family:"Cormorant Garamond",serif; font-weight:600; font-size:1.7rem; color:var(--accent); line-height:1; }
  .stat-label { font-size:0.82rem; color:var(--muted); margin-top:6px; }
  .table-wrap { background:var(--card); border-radius:14px; box-shadow:0 6px 20px -16px rgba(0,0,0,0.15); overflow-x:auto; }
  table { width:100%; border-collapse:collapse; font-size:0.85rem; white-space:nowrap; }
  th, td { padding:10px 14px; text-align:left; border-bottom:1px solid #f1ece1; vertical-align:middle; }
  th { color:var(--muted); font-weight:600; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.03em; }
  .badge { display:inline-block; padding:3px 10px; border-radius:999px; font-size:0.72rem; font-weight:600; }
  .badge-green { background:#e2f3dd; color:#2f6b28; }
  .badge-red { background:#fdeee7; color:#b1451f; }
  .btn-small { border:1px solid var(--accent); background:#fff; color:var(--accent); border-radius:999px; padding:6px 12px; font-size:0.75rem; font-weight:600; cursor:pointer; font-family:inherit; }
  .btn-small:hover { background:var(--accent); color:#fff; }
  .empty { color:var(--muted); padding:24px; text-align:center; }
</style>
</head>
<body>
<header>
  <div class="brand">Wed<span>Connect</span> Admin</div>
  <nav>
    <a href="/admin/rendelesek">Rendelések</a>
    <a href="/admin/viszonteladok" class="active">Viszonteladók</a>
    <form method="POST" action="/api/admin-logout" class="logout-form"><button type="submit">Kijelentkezés</button></form>
  </nav>
</header>
<main>
  <h2>Viszonteladók</h2>
  <div class="stats-bar">
    <div class="stat"><div class="stat-value">${(viszontelado || []).length}</div><div class="stat-label">regisztrált viszonteladó</div></div>
    <div class="stat"><div class="stat-value">${(viszontelado || []).filter((v) => v.allapot === "Aktív").length}</div><div class="stat-label">aktív</div></div>
  </div>
  <div class="table-wrap">
    ${
      viszontelado && viszontelado.length
        ? `<table>
            <thead><tr>
              <th>Regisztráció</th><th>Cégnév</th><th>Email</th><th>Ország</th><th>Nyelv</th><th>Párok</th><th>Állapot</th><th></th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>`
        : `<div class="empty">Még nincs egyetlen viszonteladó sem.</div>`
    }
  </div>
</main>
</body>
</html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=UTF-8" } });
}
