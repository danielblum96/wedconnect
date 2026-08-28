import { getAdminSession } from "../_utils/adminAuth.js";
import { escapeHtml } from "../_utils/html.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  const session = await getAdminSession(request, env.DB);
  if (!session) return Response.redirect(new URL("/admin/login", request.url).href, 303);

  const { results: rendelesek } = await env.DB.prepare(
    `SELECT r.id, r.csomag, r.mennyiseg, r.ar_osszesen, r.penznem, r.allapot, r.letrehozva,
            r.szallitasi_utca, r.szallitasi_irsz, r.szallitasi_varos, r.szallitasi_orszag,
            r.kiszallitva_datum, p.par_neve, p.slug, v.ceg_nev, v.email
     FROM rendelesek r
     LEFT JOIN parok p ON r.par_id = p.id
     LEFT JOIN viszontelado v ON r.viszontelado_id = v.id
     ORDER BY r.letrehozva DESC`
  ).all();

  const paid = (rendelesek || []).filter((r) => r.allapot === "Fizetve");
  const needsShipping = paid.filter((r) => r.mennyiseg > 1 && !r.kiszallitva_datum);
  const revenueByCurrency = {};
  paid.forEach((r) => {
    const cur = r.penznem || "EUR";
    revenueByCurrency[cur] = (revenueByCurrency[cur] || 0) + (r.ar_osszesen || 0);
  });
  const revenueText = Object.entries(revenueByCurrency)
    .map(([cur, sum]) => `${sum.toLocaleString("hu-HU")} ${cur}`)
    .join(" + ") || "0";

  const rows = (rendelesek || [])
    .map((r) => {
      const isPhysical = r.mennyiseg > 1;
      const shippingAddr = isPhysical
        ? [r.szallitasi_utca, r.szallitasi_irsz, r.szallitasi_varos, r.szallitasi_orszag].filter(Boolean).join(", ")
        : "—";
      const shippedBadge = r.kiszallitva_datum
        ? `<span class="badge badge-green">Postázva (${escapeHtml(r.kiszallitva_datum.slice(0, 10))})</span>`
        : isPhysical && r.allapot === "Fizetve"
        ? `<span class="badge badge-orange">Postázásra vár</span>`
        : "—";
      const shippingAction =
        isPhysical && r.allapot === "Fizetve"
          ? `<form method="POST" action="/api/admin-mark-shipped">
              <input type="hidden" name="rendeles_id" value="${r.id}">
              <input type="hidden" name="action" value="${r.kiszallitva_datum ? "unship" : "ship"}">
              <button type="submit" class="btn-small">${r.kiszallitva_datum ? "Visszavonás" : "Postázva jelölés"}</button>
            </form>`
          : "";
      const markPaidAction =
        r.allapot !== "Fizetve"
          ? `<form method="POST" action="/api/admin-mark-paid" onsubmit="return confirm('Biztosan fizetettként jelöli ezt a rendelést? (pl. készpénz/utalás esetén)')">
              <input type="hidden" name="rendeles_id" value="${r.id}">
              <button type="submit" class="btn-small btn-small-green">Fizetettként jelölés</button>
            </form>`
          : "";
      const deleteAction = `<form method="POST" action="/api/admin-delete-rendeles" onsubmit="return confirm('Biztosan véglegesen törli ezt a rendelést?')">
              <input type="hidden" name="rendeles_id" value="${r.id}">
              <button type="submit" class="btn-small btn-small-red">Törlés</button>
            </form>`;
      return `
        <tr>
          <td>${escapeHtml((r.letrehozva || "").slice(0, 16).replace("T", " "))}</td>
          <td>${escapeHtml(r.ceg_nev || "—")}<br><span class="muted">${escapeHtml(r.email || "")}</span></td>
          <td>${escapeHtml(r.par_neve || "—")}</td>
          <td>${escapeHtml(r.csomag)}</td>
          <td>${r.mennyiseg}</td>
          <td>${(r.ar_osszesen || 0).toLocaleString("hu-HU")} ${escapeHtml(r.penznem || "")}</td>
          <td><span class="badge ${r.allapot === "Fizetve" ? "badge-green" : "badge-orange"}">${escapeHtml(r.allapot)}</span></td>
          <td>${escapeHtml(shippingAddr)}</td>
          <td>${shippedBadge}</td>
          <td><div class="action-group">${shippingAction}${markPaidAction}${deleteAction}</div></td>
        </tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="hu">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>Admin — Rendelések</title>
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
  main { max-width:1400px; margin:0 auto; padding:36px 24px 80px; }
  h2 { font-family:"Cormorant Garamond",serif; font-size:1.5rem; margin:0 0 18px; }
  .stats-bar { display:flex; gap:16px; flex-wrap:wrap; margin-bottom:28px; }
  .stat { flex:1; min-width:180px; background:var(--card); border-radius:14px; padding:20px 22px; box-shadow:0 6px 20px -16px rgba(0,0,0,0.15); }
  .stat-value { font-family:"Cormorant Garamond",serif; font-weight:600; font-size:1.7rem; color:var(--accent); line-height:1; }
  .stat-label { font-size:0.82rem; color:var(--muted); margin-top:6px; }
  .table-wrap { background:var(--card); border-radius:14px; box-shadow:0 6px 20px -16px rgba(0,0,0,0.15); overflow-x:auto; }
  table { width:100%; border-collapse:collapse; font-size:0.83rem; white-space:nowrap; }
  th, td { padding:10px 14px; text-align:left; border-bottom:1px solid #f1ece1; vertical-align:top; }
  th { color:var(--muted); font-weight:600; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.03em; }
  .muted { color:var(--muted); font-size:0.78rem; }
  .badge { display:inline-block; padding:3px 10px; border-radius:999px; font-size:0.72rem; font-weight:600; white-space:nowrap; }
  .badge-green { background:#e2f3dd; color:#2f6b28; }
  .badge-orange { background:#ffe9d1; color:#8a4a0f; }
  .action-group { display:flex; flex-direction:column; gap:6px; align-items:flex-start; }
  .btn-small { border:1px solid var(--accent); background:#fff; color:var(--accent); border-radius:999px; padding:6px 12px; font-size:0.75rem; font-weight:600; cursor:pointer; font-family:inherit; white-space:nowrap; }
  .btn-small:hover { background:var(--accent); color:#fff; }
  .btn-small-green { border-color:#3a7a4e; color:#3a7a4e; }
  .btn-small-green:hover { background:#3a7a4e; color:#fff; }
  .btn-small-red { border-color:#b1451f; color:#b1451f; }
  .btn-small-red:hover { background:#b1451f; color:#fff; }
  .empty { color:var(--muted); padding:24px; text-align:center; }
</style>
</head>
<body>
<header>
  <div class="brand">Wed<span>Connect</span> Admin</div>
  <nav>
    <a href="/admin/rendelesek" class="active">Rendelések</a>
    <a href="/admin/viszonteladok">Viszonteladók</a>
    <form method="POST" action="/api/admin-logout" class="logout-form"><button type="submit">Kijelentkezés</button></form>
  </nav>
</header>
<main>
  <h2>Rendelések</h2>
  <div class="stats-bar">
    <div class="stat"><div class="stat-value">${paid.length}</div><div class="stat-label">kifizetett rendelés</div></div>
    <div class="stat"><div class="stat-value">${revenueText}</div><div class="stat-label">összbevétel</div></div>
    <div class="stat"><div class="stat-value">${needsShipping.length}</div><div class="stat-label">postázásra vár</div></div>
  </div>
  <div class="table-wrap">
    ${
      rendelesek && rendelesek.length
        ? `<table>
            <thead><tr>
              <th>Dátum</th><th>Viszonteladó</th><th>Pár</th><th>Csomag</th><th>Menny.</th><th>Összeg</th>
              <th>Állapot</th><th>Szállítási cím</th><th>Postázás</th><th></th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>`
        : `<div class="empty">Még nincs egyetlen rendelés sem.</div>`
    }
  </div>
</main>
</body>
</html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=UTF-8" } });
}
