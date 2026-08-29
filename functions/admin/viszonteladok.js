import { getAdminSession } from "../_utils/adminAuth.js";
import { escapeHtml } from "../_utils/html.js";

// Egyszerű, szabály-alapú szegmentálás a jövőbeli PPC-célközönség-tervhez
// (kizáró célközönség a nulla rendelést leadóknak, "elit"/lookalike-forrás
// a rendszeresen rendelőknek) - a küszöbök egyelőre becsültek, később a
// tényleges konverziós adatok alapján finomíthatók.
function classifySegment(v) {
  const regDate = new Date(`${(v.letrehozva || "").replace(" ", "T")}Z`);
  const monthsSinceReg = (Date.now() - regDate.getTime()) / (30 * 24 * 3600 * 1000);

  // Az első hónapban még nincs elég adat egy havi-átlag becsléshez - enélkül
  // egy friss regisztráció akár egyetlen rendeléstől is "Elit"-nek tűnne.
  if (monthsSinceReg < 1) return { label: "Új (< 1 hónap)", cls: "badge-blue" };
  if (v.fizetett_rendelesek === 0) return { label: "Nulla rendelés", cls: "badge-red" };

  const avgMonthly = v.fizetett_rendelesek / monthsSinceReg;
  if (avgMonthly >= 1) return { label: "Elit (havi 1+)", cls: "badge-green" };
  return { label: "Átlagos", cls: "badge-orange" };
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const session = await getAdminSession(request, env.DB);
  if (!session) return Response.redirect(new URL("/admin/login", request.url).href, 303);

  const { results: viszonteladoRaw } = await env.DB.prepare(
    `SELECT v.id, v.ceg_nev, v.email, v.orszag, v.nyelv, v.allapot, v.letrehozva,
            (SELECT COUNT(*) FROM parok p WHERE p.viszontelado_id = v.id) AS parok_szama,
            (SELECT COUNT(*) FROM rendelesek r WHERE r.viszontelado_id = v.id AND r.allapot = 'Fizetve') AS fizetett_rendelesek,
            (SELECT COALESCE(SUM(r.ar_osszesen), 0) FROM rendelesek r WHERE r.viszontelado_id = v.id AND r.allapot = 'Fizetve') AS osszbevetel,
            (SELECT r.penznem FROM rendelesek r WHERE r.viszontelado_id = v.id AND r.allapot = 'Fizetve' LIMIT 1) AS penznem,
            (SELECT MAX(r.letrehozva) FROM rendelesek r WHERE r.viszontelado_id = v.id AND r.allapot = 'Fizetve') AS utolso_rendeles
     FROM viszontelado v
     ORDER BY v.letrehozva DESC`
  ).all();

  const viszontelado = (viszonteladoRaw || []).map((v) => ({ ...v, segment: classifySegment(v) }));
  const countries = [...new Set(viszontelado.map((v) => v.orszag).filter(Boolean))].sort();
  const eliteCount = viszontelado.filter((v) => v.segment.label.startsWith("Elit")).length;
  const zeroOrderCount = viszontelado.filter((v) => v.segment.label === "Nulla rendelés").length;

  const rows = viszontelado
    .map((v) => {
      const isActive = v.allapot === "Aktív";
      return `
        <tr data-orszag="${escapeHtml(v.orszag || "")}">
          <td>${escapeHtml((v.letrehozva || "").slice(0, 10))}</td>
          <td>${escapeHtml(v.ceg_nev)}</td>
          <td>${escapeHtml(v.email)}</td>
          <td>${escapeHtml(v.orszag || "—")}</td>
          <td>${escapeHtml((v.nyelv || "").toUpperCase())}</td>
          <td>${v.parok_szama}</td>
          <td>${v.fizetett_rendelesek}</td>
          <td>${v.osszbevetel ? `${v.osszbevetel.toLocaleString("hu-HU")} ${escapeHtml(v.penznem || "")}` : "—"}</td>
          <td>${v.utolso_rendeles ? escapeHtml(v.utolso_rendeles.slice(0, 10)) : "—"}</td>
          <td><span class="badge ${v.segment.cls}">${escapeHtml(v.segment.label)}</span></td>
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

  const countryOptionsHtml = countries.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");

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
  nav a { color:var(--muted); text-decoration:underline; font-size:0.95rem; }
  nav a.active { color:var(--fg); font-weight:600; text-decoration:none; }
  .logout-form button { border:none; background:none; color:var(--muted); text-decoration:underline; cursor:pointer; font-family:inherit; font-size:0.95rem; }
  main { max-width:1400px; margin:0 auto; padding:36px 24px 80px; }
  h2 { font-family:"Cormorant Garamond",serif; font-size:1.5rem; margin:0 0 18px; }
  .stats-bar { display:flex; gap:16px; flex-wrap:wrap; margin-bottom:28px; }
  .stat { flex:1; min-width:180px; background:var(--card); border-radius:14px; padding:20px 22px; box-shadow:0 6px 20px -16px rgba(0,0,0,0.15); }
  .stat-value { font-family:"Cormorant Garamond",serif; font-weight:600; font-size:1.7rem; color:var(--accent); line-height:1; }
  .stat-label { font-size:0.9rem; color:var(--muted); margin-top:6px; }
  .filter-bar { display:flex; align-items:center; gap:10px; margin-bottom:16px; }
  .filter-bar label { font-size:0.9rem; color:var(--muted); font-weight:600; }
  .filter-bar select { padding:8px 12px; border:1px solid #ddd6c9; border-radius:8px; font-family:inherit; font-size:0.95rem; background:#fff; }
  .table-wrap { background:var(--card); border-radius:14px; box-shadow:0 6px 20px -16px rgba(0,0,0,0.15); overflow-x:auto; }
  table { width:100%; border-collapse:collapse; font-size:0.92rem; white-space:nowrap; }
  th, td { padding:10px 14px; text-align:left; border-bottom:1px solid #f1ece1; vertical-align:middle; }
  th { color:var(--muted); font-weight:600; font-size:0.85rem; text-transform:uppercase; letter-spacing:0.03em; }
  .badge { display:inline-block; padding:3px 10px; border-radius:999px; font-size:0.82rem; font-weight:600; white-space:nowrap; }
  .badge-green { background:#e2f3dd; color:#2f6b28; }
  .badge-red { background:#fdeee7; color:#b1451f; }
  .badge-orange { background:#ffe9d1; color:#8a4a0f; }
  .badge-blue { background:#e0ecf7; color:#2a5a8a; }
  .btn-small { border:1px solid var(--accent); background:#fff; color:var(--accent); border-radius:999px; padding:6px 12px; font-size:0.85rem; font-weight:600; cursor:pointer; font-family:inherit; }
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
    <div class="stat"><div class="stat-value">${viszontelado.length}</div><div class="stat-label">regisztrált viszonteladó</div></div>
    <div class="stat"><div class="stat-value">${viszontelado.filter((v) => v.allapot === "Aktív").length}</div><div class="stat-label">aktív</div></div>
    <div class="stat"><div class="stat-value">${eliteCount}</div><div class="stat-label">elit szegmens (havi 1+ rendelés)</div></div>
    <div class="stat"><div class="stat-value">${zeroOrderCount}</div><div class="stat-label">nulla rendelés (kizáró szegmens)</div></div>
  </div>
  <div class="filter-bar">
    <label for="country-filter">Szűrés országra:</label>
    <select id="country-filter">
      <option value="">Összes ország</option>
      ${countryOptionsHtml}
    </select>
  </div>
  <div class="table-wrap">
    ${
      viszontelado.length
        ? `<table id="viszontelado-table">
            <thead><tr>
              <th>Regisztráció</th><th>Cégnév</th><th>Email</th><th>Ország</th><th>Nyelv</th><th>Párok</th>
              <th>Rendelések</th><th>Bevétel</th><th>Utolsó rendelés</th><th>Szegmens</th><th>Állapot</th><th></th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>`
        : `<div class="empty">Még nincs egyetlen viszonteladó sem.</div>`
    }
  </div>
</main>
<script>
  var countryFilter = document.getElementById("country-filter");
  if (countryFilter) {
    countryFilter.addEventListener("change", function () {
      var val = countryFilter.value;
      document.querySelectorAll("#viszontelado-table tbody tr").forEach(function (tr) {
        tr.hidden = val !== "" && tr.getAttribute("data-orszag") !== val;
      });
    });
  }
</script>
</body>
</html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=UTF-8" } });
}
