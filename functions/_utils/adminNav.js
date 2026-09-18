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
`;

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
