import { getAdminSession } from "../../_utils/adminAuth.js";
import { adminNav, adminNavCss } from "../../_utils/adminNav.js";

// Mérési dokumentáció: a Meta Pixel + Conversions API mérés pontos leírása
// (2026-09-19-i állapot). Statikus tartalom - a mérés változásakor kézzel kell
// frissíteni, ld. az Obsidian "Viszonteladói platform" jegyzet mérés-szakaszait.
const DOC_HTML = `<main class="doc">
  <header>
    <h1>WedConnect mérési rendszer</h1>
    <p class="lede">Hogyan mérjük a hirdetésből érkező regisztrációkat és vásárlásokat a wedconnect.eu-n: mi mit küld, honnan, milyen hozzájárulással, és mi nincs még kész. Szakértői átnézésre.</p>
    <div class="meta">
      <span><b>Állapot:</b> 2026-09-19, élő (2. csomag után)</span>
      <span><b>Meta Pixel ID:</b> <code>1069938152514040</code></span>
      <span><b>Domain:</b> wedconnect.eu, Metában ellenőrzött</span>
      <span><b>Infrastruktúra:</b> Cloudflare Pages + Functions, D1 (SQLite)</span>
    </div>
    <nav class="toc" aria-label="Tartalom">
      <a href="#tolcser">Tölcsér</a>
      <a href="#adatfolyam">Adatfolyam</a>
      <a href="#hozzajarulas">Hozzájárulás</a>
      <a href="#kliens">Kliens-oldal</a>
      <a href="#attribucio">Attribúció</a>
      <a href="#capi">Szerver-oldali események</a>
      <a href="#adatmodell">Adatmodell</a>
      <a href="#kampany">Kampány</a>
      <a href="#ellenorzes">Ellenőrzöttség</a>
      <a href="#hianyossagok">Hiányosságok</a>
      <a href="#kerdesek">Kérdések</a>
    </nav>
  </header>

  <section class="summary">
    <h2>Röviden</h2>
    <ul>
      <li>A Meta Pixel a nyilvános oldalakon csak <code>PageView</code>-t küld, <b>marketing-hozzájárulással</b>.</li>
      <li>A négy üzleti esemény, a <code>CompleteRegistration</code>, <code>WeddingPagePublished</code>, <code>InitiateCheckout</code> és <code>Purchase</code>, <b>kizárólag szerver-oldalról</b>, a Conversions API-n megy ki. Kliens-oldali párjuk nincs, ezért böngésző-szerver deduplikáció sem kell.</li>
      <li>Hozzájárulás nélkül semmi nem tárolódik az attribúcióból, és semmi nem megy a Metának. A döntést a böngésző viszi át a szervernek a regisztrációs űrlap rejtett mezőjében.</li>
      <li>Az attribúciót (UTM, <code>fbclid</code>/<code>fbc</code>, <code>fbp</code>, IP, User-Agent) a regisztrációkor a fiókhoz mentjük. A fizetés indításakor a szerver a kérésből friss böngészőadatot (<code>_fbp</code>/<code>_fbc</code> sütik, IP, User-Agent) olvas és a rendeléshez menti, a <code>Purchase</code> ezt használja, tartalékként a regisztrációkori attribúciót.</li>
      <li>Minden üzleti esemény bekerül a saját eseménynaplóba (<code>measurement_events</code>) is, hozzájárulástól függetlenül, hirdetési azonosítók nélkül, a Meta-küldés állapotával és válaszával. A <code>Purchase</code> egyszeri feldolgozását atomi átvétel biztosítja, az <code>event_id</code> determinisztikus.</li>
    </ul>
  </section>

  <h2 id="tolcser">1. Az üzleti tölcsér</h2>
  <p>A termék egy esküvői weboldal, amit a felhasználó a saját maga hoz létre. A hirdetés a magánszemélyeknek szóló regisztrációs oldalra (<code>/hu/sajat-oldal</code>) vezet. Az oldal a varázsló végén <b>azonnal élesedik, fizetés nélkül</b>, és 24 órán belül vagy ki kell fizetni, vagy le kell adni egy legalább 50 darabos Save the Date rendelést (ekkor az oldal díja elmarad). Különben az oldal törlődik.</p>
  <div class="scroll">
    <table>
      <thead><tr><th>Lépés</th><th>Mérve?</th><th>Hogyan</th></tr></thead>
      <tbody>
        <tr><td>Hirdetés-kattintás, landolás</td><td><span class="pill ok">igen</span></td><td>Pixel <code>PageView</code> + attribúció-rögzítés (hozzájárulással)</td></tr>
        <tr><td>Regisztráció (név, email, telefon, jelszó, adatkezelés)</td><td><span class="pill ok">igen</span></td><td>Szerver-oldali <code>CompleteRegistration</code></td></tr>
        <tr><td>Esküvői oldal létrehozása (6 lépéses varázsló)</td><td><span class="pill ok">igen</span></td><td>Szerver-oldali <code>WeddingPagePublished</code> (az oldal a létrehozáskor azonnal élesedik); a dashboardon a Pixel nem fut</td></tr>
        <tr><td>Fizetés indítása (Stripe Checkout)</td><td><span class="pill ok">igen</span></td><td>Szerver-oldali <code>InitiateCheckout</code>, friss böngészőadattal</td></tr>
        <tr><td>Fizetés / Save the Date rendelés</td><td><span class="pill ok">igen</span></td><td>Szerver-oldali <code>Purchase</code> valós értékkel</td></tr>
        <tr><td>Lejárat, törlés</td><td><span class="pill no">nem</span></td><td>Nincs esemény (csak a D1-ben látszik)</td></tr>
      </tbody>
    </table>
  </div>
  <h3>Árak (a <code>Purchase</code> értéke ebből jön)</h3>
  <div class="scroll">
    <table>
      <thead><tr><th>Fiók</th><th>Esküvői oldal</th><th>Save the Date</th><th>Pénznem</th></tr></thead>
      <tbody>
        <tr><td>Magánszemély, HU</td><td>19 990</td><td>1 990 / db, min. 50 (oldal ingyenes)</td><td>HUF</td></tr>
        <tr><td>Viszonteladó, HU</td><td>9 990</td><td>1 290 / db</td><td>HUF</td></tr>
        <tr><td>Viszonteladó, DE/AT/CH és EN</td><td>50</td><td>4 / db</td><td>EUR</td></tr>
      </tbody>
    </table>
  </div>
  <p><b>Bevétel-definíció (magánszemély, HU):</b> az árak <b>bruttók</b>, az ÁFÁ-t tartalmazzák. A Save the Date szállítása <b>ingyenes</b>, ezért a rendelés összege a darabszám és a darabár szorzata (50 db-tól az oldal díja elmarad), külön szállítási tétel nincs. Kedvezmény nincs. A viszonteladói (B2B) árakról a bruttó/nettó megjelölés nincs rögzítve.</p>
  <p class="note">A fizetés két úton is beérkezhet, és mindkettő ugyanazt a függvényt hívja: Stripe webhook, illetve a Checkout utáni visszairányítás (<code>success_url</code>). Az admin felületen kézzel is meg lehet jelölni egy rendelést fizetettnek (készpénz, utalás), ez ugyanazt a függvényt futtatja.</p>

  <h2 id="adatfolyam">2. Adatfolyam</h2>
  <div class="flow">
    <h3>A. Regisztráció</h3>
    <ol class="steps">
      <li><span class="lane">Böngésző</span><span>A látogató hirdetés-kattintással érkezik (<code>fbclid</code> + UTM az URL-ben). A süti-banner megkérdezi a hozzájárulást.</span></li>
      <li><span class="lane">Böngésző</span><span>Marketing-hozzájárulással: a Pixel betölt (<code>PageView</code>), és az attribúció a <code>localStorage</code>-ba kerül.</span></li>
      <li><span class="lane">Böngésző</span><span>Az űrlap beküldésekor egy <code>submit</code>-figyelő a rejtett <code>attribution</code> mezőbe írja a hozzájárulás állapotát és (csak igen esetén) az attribúciót plusz az <code>_fbp</code>/<code>_fbc</code> sütiket.</span></li>
      <li><span class="lane">Szerver</span><span><code>individual-register.js</code> / <code>reseller-register.js</code> validálja a mezőt, létrehozza a fiókot, és menti a <code>marketing_hozzajarulas</code> és <code>attribucio</code> oszlopokat.</span></li>
      <li><span class="lane">Szerver</span><span>Az esemény bekerül a <code>measurement_events</code> naplóba (mindig, hirdetési azonosítók nélkül).</span></li>
      <li><span class="lane meta-lane">Meta CAPI</span><span>Csak hozzájárulással: <code>CompleteRegistration</code>, a válasz elküldése után, a háttérben (<code>waitUntil</code>); a Meta válasza a naplóba kerül.</span></li>
      <li><span class="lane">Szerver</span><span>Az esküvői oldal létrehozásakor ugyanígy: naplózás, majd hozzájárulással <code>WeddingPagePublished</code>.</span></li>
    </ol>
    <h3>B. Vásárlás</h3>
    <ol class="steps">
      <li><span class="lane">Szerver</span><span>A fizetés indításakor (Stripe Checkout Session létrehozása) a kérésből kiolvassa a friss <code>_fbp</code>/<code>_fbc</code> sütiket, az IP-t és a User-Agentet, a rendelésre menti (<code>mero_kontextus</code>, csak hozzájárulással), és naplózza az <code>InitiateCheckout</code>-ot (hozzájárulással a Metának is).</span></li>
      <li><span class="lane">Stripe</span><span>A felhasználó fizet a Checkoutban. A visszaigazolás két úton jöhet: webhook, illetve a Checkout utáni visszairányítás. Admin kézi jelölés is ide fut.</span></li>
      <li><span class="lane">Szerver</span><span><code>fulfillStripeOrder()</code>: atomi átvétel (egyetlen feltételes <code>UPDATE … WHERE allapot IS NOT 'Fizetve'</code>, csak az a hívás folytatja, amelyik módosított sort). A rendelés <code>Fizetve</code> lesz, az oldal rendezetté válik, az admin emailt kap.</span></li>
      <li><span class="lane">Szerver</span><span>Beolvassa a mentett adatokat: <code>marketing_hozzajarulas</code>, a rendelés friss <code>mero_kontextus</code>-át (tartalék: a regisztrációkori <code>attribucio</code>), telefon, név.</span></li>
      <li><span class="lane meta-lane">Meta CAPI</span><span>Naplózás, majd csak hozzájárulással: <code>Purchase</code> a rendelés valós összegével és pénznemével (az admin email előtt).</span></li>
    </ol>
  </div>

  <h2 id="hozzajarulas">3. Hozzájárulás (consent)</h2>
  <ul>
    <li>Saját süti-banner (<code>assets/cookie-consent.js</code>), három kategória: szükséges, statisztikai, marketing. Alapértelmezés: minden nem szükséges <b>elutasítva</b>. A banner nyelve a böngésző nyelvéhez igazodik.</li>
    <li>A döntés a <code>localStorage</code> <code>wedconnect_cookie_consent</code> kulcsán él (<code>version: 1</code>). Google Consent Mode v2 alapjelzések is beállnak, de GA4 és Google Ads azonosító jelenleg nincs megadva, ezért ennek nincs hatása.</li>
    <li>A szerver a <code>localStorage</code>-t nem látja, ezért a regisztrációs űrlap beküldésekor a <code>consent_marketing</code> érték az <code>attribution</code> rejtett mezőben utazik. Ez kliens-oldali állítás, ugyanolyan bizalommal kezeljük, mint bármely hozzájárulás-kezelő döntését.</li>
    <li>A szerver a döntést a fiókhoz menti (<code>viszontelado.marketing_hozzajarulas</code>, 0/1), mert a <code>Purchase</code> később, más kérésben fut.</li>
    <li>Hozzájárulás nélkül: nincs Pixel, nincs tárolt attribúció (még IP/User-Agent sem), nincs Meta-esemény.</li>
    <li>Az adatkezelési tájékoztató (HU/DE/EN) leírja a Metának küldött adatokat. A cégadatok helyén kitöltendő helykitöltők vannak, és jogi átnézésen még nem esett át.</li>
  </ul>

  <h2 id="kliens">4. Kliens-oldali mérés</h2>
  <ul>
    <li>A Pixel (<code>fbevents.js</code>) két hívást kap: <code>fbq("init", …)</code> és <code>fbq("track", "PageView")</code>. Más kliens-oldali Meta-esemény nincs.</li>
    <li>A <code>cookie-consent.js</code> 8 nyilvános statikus oldalon fut: <code>hu/index</code>, <code>de/index</code>, <code>hu/sajat-oldal</code>, <code>hu/regisztracio</code>, <code>de/registrieren</code>, <code>en/register</code>, <code>hu/eskuvoi-koszonoajandek</code>, <code>stilus-valaszto</code>.</li>
    <li><b>Nem fut</b> a dashboardon (varázsló), a Stripe-ról visszatérő oldalon, a bejelentkezésen és a vendégek által látott esküvői oldalakon. A regisztráció utáni út böngésző-oldalon nem mérhető, szerver-oldalról viszont igen (oldal létrehozva, fizetés indítva, vásárlás).</li>
    <li>A dashboardban 8 névvel ellátott <code>trackEvent()</code> hívási pont van (pl. <code>wedding_page_completed</code>, <code>save_the_date_order_started</code>). Ezek jelenleg <b>nem csinálnak semmit</b>: a függvény <code>window.gtag</code>-ot hív, ami ezeken az oldalakon nincs betöltve.</li>
  </ul>

  <h2 id="attribucio">5. Attribúció-rögzítés</h2>
  <p>Csak marketing-hozzájárulással fut. Logika: az utolsó <b>fizetett</b> érintés (UTM vagy <code>fbclid</code> az URL-ben) felülírja a korábbit, egyébként az első érintés marad meg. Élettartam: 90 nap (<code>localStorage</code>, <code>wedconnect_attribution</code>). A landing és a regisztrációs oldal különbözhet, az attribúció közben megmarad.</p>
  <div class="scroll">
    <table>
      <thead><tr><th>Mező</th><th>Forrás</th></tr></thead>
      <tbody>
        <tr><td><code>utm_source / medium / campaign / content / term</code></td><td>Az URL lekérdezés-paraméterei a landoláskor</td></tr>
        <tr><td><code>fbclid</code></td><td>URL</td></tr>
        <tr><td><code>fbc</code></td><td>A Pixel <code>_fbc</code> sütije; ennek hiányában <code>fb.1.&lt;idő&gt;.&lt;fbclid&gt;</code></td></tr>
        <tr><td><code>fbp</code></td><td>A Pixel <code>_fbp</code> sütije, beküldéskor kiolvasva</td></tr>
        <tr><td><code>landing_url</code>, <code>referrer</code></td><td><code>location</code> (lekérdezés nélkül), <code>document.referrer</code></td></tr>
        <tr><td><code>client_ip</code>, <code>client_user_agent</code></td><td>A regisztrációs kérésből, szerver-oldalon</td></tr>
      </tbody>
    </table>
  </div>
  <p>Szerver-oldali védelem: csak ismert kulcsok, legfeljebb 300 karakteres értékek, 4000 karakteres payload-plafon, hibás JSON esetén hozzájárulás nélkülinek számít. Tárolás: <code>viszontelado.attribucio</code> (JSON szöveg). Példa (a valós értékek helyett jelölők):</p>
<pre><code>{"utm_source":"facebook","utm_medium":"paid_social",
 "utm_campaign":"&lt;campaign.id&gt;","utm_content":"&lt;ad.id&gt;","utm_term":"&lt;adset.id&gt;",
 "fbclid":"…","fbc":"fb.1.&lt;ts&gt;.&lt;fbclid&gt;","fbp":"fb.1.&lt;ts&gt;.&lt;rand&gt;",
 "landing_url":"https://wedconnect.eu/hu/sajat-oldal/",
 "client_ip":"…","client_user_agent":"…"}</code></pre>

  <h2 id="capi">6. Szerver-oldali események (Conversions API)</h2>
  <p>Végpont: <code>POST https://graph.facebook.com/v21.0/1069938152514040/events</code>. A hozzáférési token Cloudflare titokként él (<code>META_CAPI_ACCESS_TOKEN</code>), a kódban és a repóban nincs. Minden hívás <code>action_source: "website"</code>. Az <code>event_id</code> az üzleti eseményhez kötött és determinisztikus: <code>registration_&lt;fiók-id&gt;</code>, <code>purchase_&lt;rendelés-id&gt;</code>, így egy esetleges duplikált beküldést a Meta összevon. Teszteléshez a <code>META_CAPI_TEST_EVENT_CODE</code> környezeti változó a kérést a Test Events fülre irányítja (élesben nincs beállítva). Minden esemény előbb a saját naplóba kerül (<code>INSERT OR IGNORE</code>, <code>event_id</code> UNIQUE), és csak azután, ha új és a felhasználó hozzájárult, megy a Metának; a naplóba a hozzájárulástól függetlenül bekerül. Admin-megtekintésből (a partner nevében járó admin) Metának nem küldünk.</p>
  <div class="scroll">
    <table>
      <thead><tr><th>Esemény</th><th>Mikor</th><th>Kézbesítés</th><th>Custom data</th></tr></thead>
      <tbody>
        <tr>
          <td><code>CompleteRegistration</code></td>
          <td>Sikeres fiók-létrehozás után, mindkét regisztrációs végponton (magánszemély és viszonteladó). Csak hozzájárulással. <code>event_source_url</code>: a regisztrációs oldal.</td>
          <td><code>waitUntil</code> (háttérben, nem lassítja a választ), újrapróbálás nincs</td>
          <td><code>account_type</code> (<code>individual</code> / <code>reseller</code>), <code>country</code></td>
        </tr>
        <tr>
          <td><code>WeddingPagePublished</code> (egyéni esemény)</td>
          <td>Az esküvői oldal létrehozásakor (<code>couple-create.js</code>), az oldal azonnal élesedik. <code>event_id</code>: <code>page_published_&lt;pár-id&gt;</code>.</td>
          <td><code>waitUntil</code>, újrapróbálás nincs</td>
          <td><code>account_type</code>, <code>country</code>, <code>language</code></td>
        </tr>
        <tr>
          <td><code>InitiateCheckout</code></td>
          <td>Sikeres Stripe Checkout Session létrehozása után (<code>couple-pay.js</code>, <code>order-save-the-date.js</code>). <code>event_id</code>: <code>checkout_&lt;rendelés-id&gt;</code>.</td>
          <td><code>waitUntil</code> (a Stripe-ra átirányítást nem lassítja)</td>
          <td><code>value</code>, <code>currency</code>, <code>order_id</code>, <code>account_type</code>, <code>product_type</code>, <code>quantity</code>, <code>country</code></td>
        </tr>
        <tr>
          <td><code>Purchase</code></td>
          <td>A <code>fulfillStripeOrder()</code> végén (webhook, success_url vagy admin kézi jelölés). Csak hozzájárulással. <code>event_source_url</code>: az esküvői oldal címe.</td>
          <td><code>await</code>, az admin email <b>előtt</b> (egy sikertelen email nem akadályozza meg); a mérés hibája nem töri meg a fizetés feldolgozását, újrapróbálás nincs</td>
          <td><code>value</code> = <code>rendelesek.ar_osszesen</code> (fő pénzegység, pl. 19990), <code>currency</code> = <code>rendelesek.penznem</code>, <code>order_id</code>, <code>account_type</code>, <code>product_type</code> (<code>wedding_website</code>, ha 50 db alatti; <code>save_the_date</code>, ha legalább 50 db), <code>quantity</code>, <code>country</code></td>
        </tr>
      </tbody>
    </table>
  </div>
  <p><b>A <code>Purchase</code> értéke:</b> <code>value</code> = <code>rendelesek.ar_osszesen</code>, vagyis az ügyfél által ténylegesen fizetett <b>bruttó</b> összeg (ÁFÁ-val, szállítás nélkül, mert az ingyenes), <b>visszatérítés előtt</b>. A visszatérítés vagy lemondás jelenleg nem korrigálja a Metának küldött értéket; a saját adatbázisban a <code>rendelesek.allapot</code> mutatja az állapotot. Nettó érték és visszatérítés külön mezőként még nincs.</p>
  <h3>user_data</h3>
  <div class="scroll">
    <table>
      <thead><tr><th>Mező</th><th>Tartalom</th><th>Hash?</th></tr></thead>
      <tbody>
        <tr><td><code>em</code></td><td>Email, kisbetűsítve és trimmelve</td><td>SHA-256</td></tr>
        <tr><td><code>ph</code></td><td>Telefon, csak számjegyek országhívóval. Normalizálás: <code>+</code> és <code>00</code> előtag megtartva; magyar <code>06…</code> → <code>36…</code>; DE/AT/CH nemzeti <code>0…</code> → az ország hívószáma; ismeretlen országnál előtag nélküli szám kimarad</td><td>SHA-256</td></tr>
        <tr><td><code>fn</code>, <code>ln</code></td><td>Keresztnév, vezetéknév (csak a 2026-09-18 óta regisztrált magánszemélyeknél; viszonteladónál nincs)</td><td>SHA-256</td></tr>
        <tr><td><code>external_id</code></td><td><code>viszontelado.id</code></td><td>SHA-256</td></tr>
        <tr><td><code>fbp</code>, <code>fbc</code></td><td>Az aktuális kérés sütijeiből (a Pixel first-party sütik, a szerver minden kérésnél megkapja); ennek hiányában a regisztrációkor mentett érték</td><td>nem</td></tr>
        <tr><td><code>client_ip_address</code>, <code>client_user_agent</code></td><td>Az aktuális kérésből; a <code>Purchase</code>-nél (a webhook nem a felhasználó böngészőjéből jön) a fizetés INDÍTÁSAKOR a rendeléshez mentett friss érték (<code>rendelesek.mero_kontextus</code>), admin kézi jelölésnél a regisztrációkori</td><td>nem</td></tr>
      </tbody>
    </table>
  </div>
  <p>Példa a kimenő <code>Purchase</code>-re (jelölők a valós értékek helyett):</p>
<pre><code>{ "data": [{
    "event_name": "Purchase",
    "event_time": 1789770000,
    "event_id": "purchase_&lt;rendelés-id&gt;",
    "event_source_url": "https://wedconnect.eu/&lt;pár-slug&gt;",
    "action_source": "website",
    "user_data": {
      "em": ["&lt;sha256&gt;"], "ph": ["&lt;sha256(36301234567)&gt;"],
      "fn": ["&lt;sha256&gt;"], "ln": ["&lt;sha256&gt;"], "external_id": ["&lt;sha256&gt;"],
      "fbp": "fb.1.…", "fbc": "fb.1.….&lt;fbclid&gt;",
      "client_ip_address": "…", "client_user_agent": "…" },
    "custom_data": { "value": 19990, "currency": "HUF", "order_id": "&lt;id&gt;",
      "account_type": "individual", "product_type": "wedding_website",
      "quantity": 1, "country": "HU" }
}]}</code></pre>

  <h2 id="adatmodell">7. Adatmodell (a méréshez releváns rész)</h2>
  <div class="scroll">
    <table>
      <thead><tr><th>Tábla</th><th>Oszlopok</th></tr></thead>
      <tbody>
        <tr><td><code>viszontelado</code></td><td><code>id</code>, <code>email</code>, <code>telefon</code>, <code>vezeteknev</code>, <code>keresztnev</code>, <code>ceg_nev</code> (magánszemélynél "Vezetéknév Keresztnév"), <code>fiok_tipus</code> (<code>maganszemely</code> / <code>viszontelado</code>), <code>orszag</code>, <code>letrehozva</code>, <code>adatkezeles_elfogadva</code> (időbélyeg), <code>marketing_hozzajarulas</code> (0/1), <code>attribucio</code> (JSON)</td></tr>
        <tr><td><code>parok</code></td><td>Az esküvői oldalak: <code>viszontelado_id</code>, <code>letrehozva</code>, <code>rendeles_id</code> (NULL = még fizetetlen, fut a 24 órás határidő)</td></tr>
        <tr><td><code>rendelesek</code></td><td><code>par_id</code>, <code>viszontelado_id</code>, <code>mennyiseg</code>, <code>ar_osszesen</code>, <code>penznem</code>, <code>allapot</code> (<code>Fizetésre vár</code> / <code>Fizetve</code>), <code>stripe_session_id</code>, <code>mero_kontextus</code> (JSON: friss fbp/fbc/IP/User-Agent a fizetés indításakor, csak hozzájárulással)</td></tr>
        <tr><td><code>measurement_events</code></td><td>Saját eseménynapló: <code>event_id</code> (UNIQUE), <code>event_name</code> (belső: <code>account_registered</code>, <code>wedding_page_published</code>, <code>checkout_started</code>, <code>payment_completed</code>), <code>meta_event_name</code>, <code>viszontelado_id</code>, <code>par_id</code>, <code>rendeles_id</code>, <code>ertek</code>, <code>penznem</code>, <code>adat</code> (üzleti mezők JSON-ban, hirdetési azonosító nélkül), <code>letrehozva</code>, <code>meta_statusz</code> (<code>fuggoben</code> / <code>elkuldve</code> / <code>hiba</code> / <code>nincs_hozzajarulas</code> / <code>admin_nezet</code> / <code>nincs_meta_esemeny</code>), <code>meta_kiserletek</code>, <code>meta_utolso_kiserlet</code>, <code>meta_valasz</code></td></tr>
      </tbody>
    </table>
  </div>
  <p>A magánszemély-fiókok ugyanabban a <code>viszontelado</code> táblában élnek, mint a viszonteladók, a <code>fiok_tipus</code> különbözteti meg őket. Az egyes mezők 2026-09-17 és 09-19 között kerültek be (telefon: 09-17, név-bontás: 09-18, hozzájárulás és attribúció: 09-19), a korábban regisztrált fiókoknál üresek. A <code>marketing_hozzajarulas</code> minden 2026-09-19 előtti fióknál 0, ezért náluk a <code>Purchase</code> nem megy ki.</p>

  <h2 id="kampany">8. Kampányterv (Meta)</h2>
  <ul>
    <li>Cél: <b>Értékesítés (Sales)</b>, konverziós helyszín: weboldal, a fenti Pixel.</li>
    <li>Optimalizálási esemény induláskor: <code>CompleteRegistration</code>. A <code>WeddingPagePublished</code> egyéni eseményből az Events Managerben egyéni konverziót kell létrehozni (az első esemény beérkezése után); ez az esküvői oldal létrehozását méri, ami erősebb szándékjel a puszta regisztrációnál, és gyakoribb a <code>Purchase</code>-nél. Javasolt sorrend: <code>CompleteRegistration</code> → <code>WeddingPagePublished</code> → <code>Purchase</code> (váltás, ha az adott esemény ad set szinten tartósan eléri a heti ~50-et).</li>
    <li>Hirdetés-URL paraméterek: <code>utm_source=facebook&amp;utm_medium=paid_social&amp;utm_campaign={{campaign.id}}&amp;utm_content={{ad.id}}&amp;utm_term={{adset.id}}</code></li>
    <li>Regisztrációs kísérlet-korlát: óránként 5 kísérlet IP-nként (a sikertelenek is számítanak).</li>
  </ul>

  <h2 id="ellenorzes">9. Mi van tényleg ellenőrizve</h2>
  <div class="scroll">
    <table>
      <thead><tr><th>Állítás</th><th>Állapot</th><th>Hogyan / megjegyzés</th></tr></thead>
      <tbody>
        <tr><td>Pixel csak hozzájárulással töltődik be</td><td><span class="pill ok">élesben</span></td><td>Elutasított hozzájárulással a <code>fbevents.js</code> nem töltődik be</td></tr>
        <tr><td>Attribúció tárolódik és a fiókhoz kerül</td><td><span class="pill ok">élesben</span></td><td>Valódi regisztráció, a D1-ben lekérdezve</td></tr>
        <tr><td>Hozzájárulás nélkül nincs tárolt attribúció</td><td><span class="pill ok">élesben</span></td><td><code>marketing_hozzajarulas=0</code>, <code>attribucio</code> NULL</td></tr>
        <tr><td><code>CompleteRegistration</code> a Meta által elfogadva</td><td><span class="pill ok">élesben</span></td><td>Valódi regisztrációval, Test Events kóddal küldve: a Meta válasza <code>events_received: 1</code>, üzenet és figyelmeztetés nélkül. Az Event Match Quality értéket az Events Managerben még nem néztük.</td></tr>
        <tr><td>Atomi fizetés-átvétel</td><td><span class="pill ok">élesben</span></td><td>SQL-szemantika valódi SQLite-on tesztelve; élesben két egyidejű fizetettnek jelölő kérésnél <b>valódi versenyhelyzet alakult ki</b>: a másik hívás a naplóba "versenyhelyzet, kihagyva" sort írt, és az eseménynaplóban egyetlen <code>purchase_&lt;id&gt;</code> sor, egy Meta-küldés maradt.</td></tr>
        <tr><td><code>WeddingPagePublished</code>, <code>InitiateCheckout</code></td><td><span class="pill ok">élesben</span></td><td>Valódi regisztrációból kiindulva a teljes út végigfuttatva Test Events kóddal: mindkettőre <code>events_received: 1</code>, figyelmeztetés nélkül (az egyéni eseménynevet is elfogadta).</td></tr>
        <tr><td>Saját eseménynapló</td><td><span class="pill ok">élesben</span></td><td>A teljes út négy eseménye rögzült, mind <code>elkuldve</code>, <code>meta_kiserletek=1</code>, a Meta válasza mentve; az azonos <code>event_id</code> másodszor nem rögzül (valódi SQLite-on tesztelve), hozzájárulás nélkül <code>nincs_hozzajarulas</code>, admin-nézetből <code>admin_nezet</code>.</td></tr>
        <tr><td>Friss böngészőadat a fizetés indításakor</td><td><span class="pill ok">élesben</span></td><td>A <code>rendelesek.mero_kontextus</code>-ban a kérésből olvasott <code>_fbp</code>, <code>_fbc</code>, IP és User-Agent megjelent, kliens-oldali szkript nélkül a dashboardon.</td></tr>
        <tr><td><code>Purchase</code> a Meta által elfogadva</td><td><span class="pill ok">élesben</span></td><td>A valódi útvonalon (admin kézi jelölés → <code>fulfillStripeOrder()</code>, ugyanaz a függvény, mint a webhooknál), Test Events kóddal küldve: <code>events_received: 1</code>, figyelmeztetés nélkül. Stripe-on keresztüli valódi fizetéssel még nem futott le.</td></tr>
        <tr><td>Domain-verifikáció</td><td><span class="pill ok">kész</span></td><td>A Business Managerben ellenőrzött (a felhasználó megerősítette)</td></tr>
        <tr><td>Event Match Quality</td><td><span class="pill no">nincs</span></td><td>Az Events Manager Test Events fülén a két teszt-esemény látszik; az EMQ értéket a felhasználó ellenőrzi.</td></tr>
      </tbody>
    </table>
  </div>

  <h2 id="hianyossagok">10. Ismert hiányosságok és kockázatok</h2>
  <p class="note">Javítva az 1. és 2. csomagban: a <code>Purchase</code> dupla kézbesítése (atomi átvétel + determinisztikus <code>event_id</code>), az események <code>account_type</code> / termék adatai, az aktivációs esemény, a <code>CheckoutStarted</code>, a saját eseménynapló és a friss böngészőadat a fizetés indításakor.</p>
  <div class="gap hi">
    <p><b>Rate limit és megosztott IP-k.</b> Óránként 5 regisztrációs kísérlet engedélyezett IP-nként. Mobilhálózati (CGNAT) vagy irodai megosztott IP mögött legitim regisztrációk is elutasításra kerülhetnek, és a hirdetésből érkező konverzió csendben elveszik (a felhasználó hibaüzenetet kap).</p>
  </div>
  <div class="gap">
    <p><b>A hozzájárulás visszavonása regisztráció után nem terjed át automatikusan.</b> A mentett állapot addig érvényes, amíg a felhasználó nem jelzi, és kézzel nem töröljük az attribúciót és nem nullázzuk a <code>marketing_hozzajarulas</code>-t.</p>
  </div>
  <div class="gap">
    <p><b>Nincs automatikus újrapróbálás és nincs admin-nézet az eseménynaplóhoz.</b> A <code>hiba</code> és a beragadt <code>fuggoben</code> állapot a naplóban látszik, de újraküldő mechanizmus (ütemezett feladat) és egyeztető felület (D1 és Meta darabszámai) még nincs; jelenleg SQL-lel kérdezhető le.</p>
  </div>
  <div class="gap">
    <p><b>A <code>mero_kontextus</code> (IP, User-Agent, fbp, fbc) a rendelésen marad a <code>Purchase</code> után is.</b> Adatminimalizálási szempontból törölhető lenne az elküldés után; jelenleg nincs törlés.</p>
  </div>
  <div class="gap">
    <p><b>Egyéb:</b> nincs GA4/Google Ads; nincs kampány-szintű riport az adminban (a D1 és a Meta-riport összevetése kézi); a Graph API verzió (<code>v21.0</code>) rögzített, élettartamát ellenőrizni kell; a telefon-normalizálás heurisztikus; az adatkezelési tájékoztató még helykitöltős és jogilag átnézetlen.</p>
  </div>

  <h2 id="kerdesek">11. Kérdések a szakértőnek</h2>
  <ol>
    <li>A hozzájárulás-kezelés (kliens-állítás a rejtett mezőben, mentett állapot a fiókon) jogilag és technikailag elég-e, és hogyan kezeljük a visszavonást a már regisztrált fiókoknál?</li>
    <li>A <code>WeddingPagePublished</code> egyéni eseményből létrehozott egyéni konverzió jól optimalizálható-e a Sales célnál, vagy érdemesebb egy szabványos eseménynevet (pl. <code>Lead</code>) használni?</li>
    <li>A saját eseménynaplóban a hozzájárulás nélküli események tárolása (üzleti adat, hirdetési azonosító nélkül, funnel-számoláshoz) jogilag rendben van-e, milyen jogalappal?</li>
    <li>Érdemes-e most GA4-et is bekötni, vagy a D1 + Events Manager páros elég az induláshoz?</li>
    <li>A telefonos utánkövetés eredménye (lezárt eladás) hogyan töltendő vissza offline konverzióként?</li>
  </ol>
  <p class="note">Az adatok forrása: a kód és az élő rendszer 2026-09-19-i állapota. Titkos adatot (hozzáférési token) a dokumentum nem tartalmaz.</p>
</main>`;

export async function onRequestGet(context) {
  const { request, env } = context;
  const session = await getAdminSession(request, env.DB);
  if (!session) return Response.redirect(new URL("/admin/login", request.url).href, 303);

  const html = `<!DOCTYPE html>
<html lang="hu">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>Admin — Mérési dokumentáció</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root { --bg:#faf7f2; --fg:#2b2620; --muted:#7a7266; --accent:#b48b56; --card:#ffffff; --line:#eee6d6; --code:#f3eee3; --mono:ui-monospace,"SF Mono",Menlo,monospace; }
  * { box-sizing: border-box; }
  body { margin:0; font-family:"Poppins",sans-serif; background:var(--bg); color:var(--fg); }
  body > header { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px 16px; padding:20px 32px; background:var(--card); box-shadow:0 2px 10px rgba(0,0,0,0.05); }
  .brand { font-family:"Cormorant Garamond",serif; font-weight:600; font-size:1.4rem; }
  .brand span { color:var(--accent); }
  .logout-form button { border:none; background:none; color:var(--muted); text-decoration:underline; cursor:pointer; font-family:inherit; font-size:0.95rem; }
  ${adminNavCss}

  .doc { max-width:880px; margin:0 auto; padding:36px 20px 90px; font-size:0.93rem; line-height:1.65; }
  .doc h1, .doc h2, .doc h3 { line-height:1.25; margin:0; text-wrap:balance; }
  .doc h1 { font-family:"Cormorant Garamond",serif; font-size:2.1rem; font-weight:600; }
  .doc h2 { font-family:"Cormorant Garamond",serif; font-size:1.5rem; font-weight:600; margin-top:44px; padding-top:20px; border-top:1px solid var(--line); }
  .doc h3 { font-size:1rem; font-weight:600; margin-top:24px; }
  .doc p { margin:10px 0; max-width:70ch; }
  .doc ul, .doc ol { margin:10px 0; padding-left:22px; max-width:74ch; }
  .doc li { margin:4px 0; }
  .doc a { color:#8c6d34; }
  .doc code { font-family:var(--mono); font-size:0.85em; background:var(--code); padding:1px 5px; border-radius:4px; overflow-wrap:anywhere; }
  .doc pre { font-family:var(--mono); font-size:0.8rem; line-height:1.55; background:var(--code); padding:14px 16px; border-radius:8px; overflow-x:auto; margin:12px 0; }
  .doc pre code { background:none; padding:0; font-size:inherit; }
  .doc .lede { font-size:1.02rem; color:var(--muted); margin-top:8px; }
  .doc .meta { display:flex; flex-wrap:wrap; gap:6px 20px; margin-top:16px; font-size:0.85rem; color:var(--muted); }
  .doc .meta b { color:var(--fg); font-weight:500; }
  .doc nav.toc { display:flex; flex-wrap:wrap; gap:6px 16px; margin-top:20px; font-size:0.85rem; }
  .doc nav.toc a { font-size:inherit; }
  .doc .summary { background:var(--card); border-radius:14px; box-shadow:0 6px 20px -16px rgba(0,0,0,0.2); padding:4px 22px 14px; margin-top:26px; }
  .doc .summary h2 { border:0; margin:0; padding:14px 0 0; font-size:1.25rem; }
  .doc .scroll { overflow-x:auto; margin:12px 0; background:var(--card); border-radius:14px; box-shadow:0 6px 20px -16px rgba(0,0,0,0.2); }
  .doc table { border-collapse:collapse; width:100%; font-size:0.86rem; }
  .doc th, .doc td { text-align:left; vertical-align:top; padding:9px 14px; border-bottom:1px solid var(--line); }
  .doc tr:last-child td { border-bottom:0; }
  .doc th { font-size:0.72rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--muted); font-weight:600; white-space:nowrap; }
  .doc td:first-child { font-weight:500; }
  .doc .pill { display:inline-block; font-size:0.74rem; font-weight:600; padding:2px 10px; border-radius:999px; white-space:nowrap; }
  .doc .ok { background:#e2f3dd; color:#2f6b28; }
  .doc .part { background:#ffe9d1; color:#8a4a0f; }
  .doc .no { background:#fdeee7; color:#b1451f; }
  .doc .flow { background:var(--card); border-radius:14px; box-shadow:0 6px 20px -16px rgba(0,0,0,0.2); padding:6px 20px; margin:14px 0; }
  .doc .flow h3 { margin-top:12px; }
  .doc .steps { list-style:none; padding:0; margin:12px 0; max-width:none; }
  .doc .steps li { display:grid; grid-template-columns:112px 1fr; gap:4px 14px; padding:11px 0; margin:0; border-bottom:1px solid var(--line); }
  .doc .steps li:last-child { border-bottom:0; }
  .doc .lane { font-size:0.7rem; font-weight:600; text-transform:uppercase; letter-spacing:0.07em; color:#8c6d34; padding-top:3px; }
  .doc .lane.meta-lane { color:#8a4a0f; }
  .doc .gap { background:var(--card); border-radius:10px; border-left:4px solid #d9903d; box-shadow:0 6px 20px -16px rgba(0,0,0,0.2); padding:10px 18px; margin:12px 0; }
  .doc .gap.hi { border-left-color:#b1451f; }
  .doc .gap p { margin:4px 0; }
  .doc .note { color:var(--muted); font-size:0.85rem; }
  @media (max-width:560px) {
    body > header { padding:16px; }
    .doc h1 { font-size:1.7rem; }
    .doc .steps li { grid-template-columns:1fr; }
    .doc .lane { padding-top:0; }
  }
</style>
</head>
<body>
<header>
  <div class="brand">Wed<span>Connect</span> Admin</div>
  ${adminNav("dokumentacio-meres")}
</header>
${DOC_HTML}
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
