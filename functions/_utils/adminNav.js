// Az admin-oldalak közös fejléc-menüje. `active`: "rendelesek" | "viszonteladok" |
// "maganszemelyek" | "dokumentacio-meres". A Dokumentáció legördülő <details>-alapú
// (JS nélkül is nyitható, érintőképernyőn is), a kis szkript csak a kívülre
// kattintásra zárja.
export const adminNavCss = `
  nav { display:flex; gap:18px; align-items:center; flex-wrap:wrap; }
  nav a, nav summary { color:var(--muted); text-decoration:underline; font-size:0.95rem; cursor:pointer; }
  nav a.active, nav summary.active { color:var(--fg); font-weight:600; text-decoration:none; }
  .nav-menu { position:relative; }
  .nav-menu summary { list-style:none; }
  .nav-menu summary::-webkit-details-marker { display:none; }
  .nav-menu summary::after { content:"\\25BE"; display:inline-block; margin-left:5px; }
  .nav-menu-list { position:absolute; right:0; top:calc(100% + 10px); z-index:20; min-width:210px; background:var(--card); border-radius:10px; box-shadow:0 10px 30px -12px rgba(0,0,0,0.28); padding:8px 0; }
  .nav-menu-list a { display:block; padding:8px 18px; white-space:nowrap; }
  .btn-danger { border-color:#b1451f !important; color:#b1451f !important; }
  .btn-danger:hover { background:#b1451f !important; color:#fff !important; }
  .notice { border-radius:10px; padding:12px 16px; margin-bottom:18px; font-size:0.95rem; }
  .notice-ok { background:#e2f3dd; color:#2f6b28; }
  .notice-err { background:#fdeee7; color:#b1451f; }
  .muted-note { color:var(--muted); font-size:0.82rem; }
`;

// Egy egyszeri visszajelzés a listák tetejére (a törlés utáni átirányítás paramétereiből).
export function adminNotice(url) {
  const q = new URL(url).searchParams;
  if (q.get("torolve")) return '<div class="notice notice-ok">A fiók és a hozzá tartozó adatok véglegesen törölve.</div>';
  if (q.get("hiba") === "fizetett_rendeles") {
    return '<div class="notice notice-err">A fiók nem törölhető, mert van fizetett rendelése (számviteli bizonylat).</div>';
  }
  if (q.get("hiba") === "nincs_oldal") {
    return '<div class="notice notice-err">Ehhez a rendeléshez már nincs oldal (a partner törölte), ezért nem jelölhető fizetettnek. Ha egy oldalt szeretnél publikálni, a partner nyomja meg az oldalán a Publikálás gombot, és az új rendelést jelöld fizetettnek.</div>';
  }
  return "";
}

export function adminNav(active) {
  const cls = (key) => (active === key ? ' class="active"' : "");
  return `<nav>
    <a href="/admin/rendelesek"${cls("rendelesek")}>Rendelések</a>
    <a href="/admin/viszonteladok"${cls("viszonteladok")}>Viszonteladók</a>
    <a href="/admin/maganszemelyek"${cls("maganszemelyek")}>Magánszemélyek</a>
    <details class="nav-menu">
      <summary${active.startsWith("dokumentacio") ? ' class="active"' : ""}>Dokumentáció</summary>
      <div class="nav-menu-list"><a href="/admin/dokumentacio/meres"${cls("dokumentacio-meres")}>Mérési dokumentáció</a></div>
    </details>
    <form method="POST" action="/api/admin-logout" class="logout-form"><button type="submit">Kijelentkezés</button></form>
  </nav>
  <script>
    (function () {
      var menu = document.querySelector(".nav-menu");
      if (!menu) return;
      document.addEventListener("click", function (e) {
        if (!menu.contains(e.target)) menu.open = false;
      });
    })();
  </script>`;
}
