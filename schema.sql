CREATE TABLE IF NOT EXISTS parok (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  par_neve TEXT NOT NULL,
  nev1 TEXT,
  nev2 TEXT,
  eskuvo_datuma TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  vendegszam INTEGER,
  nfc_kod TEXT UNIQUE,
  drive_link TEXT,
  video_link TEXT,
  allapot TEXT NOT NULL DEFAULT 'Új',
  szallitasi_cim TEXT,
  valasztott_stilus TEXT,
  megjegyzes TEXT,
  letrehozva TEXT NOT NULL DEFAULT (datetime('now')),
  viszontelado_id INTEGER REFERENCES viszontelado(id),
  rendeles_id INTEGER REFERENCES rendelesek(id),
  egyedi_gombok TEXT,
  egyedi_uzenet TEXT,
  nyelv TEXT NOT NULL DEFAULT 'hu'
);

CREATE TABLE IF NOT EXISTS viszontelado (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ceg_nev TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  jelszo_hash TEXT NOT NULL,
  orszag TEXT NOT NULL,
  nyelv TEXT NOT NULL DEFAULT 'de',
  allapot TEXT NOT NULL DEFAULT 'Aktív',
  letrehozva TEXT NOT NULL DEFAULT (datetime('now')),
  adoszam TEXT,
  szamlazasi_utca TEXT,
  szamlazasi_irsz TEXT,
  szamlazasi_varos TEXT,
  szamlazasi_orszag TEXT,
  szallitas_azonos INTEGER NOT NULL DEFAULT 1,
  alap_szallitasi_utca TEXT,
  alap_szallitasi_irsz TEXT,
  alap_szallitasi_varos TEXT,
  alap_szallitasi_orszag TEXT
);

CREATE TABLE IF NOT EXISTS rendelesek (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  viszontelado_id INTEGER NOT NULL REFERENCES viszontelado(id),
  par_id INTEGER REFERENCES parok(id),
  csomag TEXT NOT NULL,
  mennyiseg INTEGER NOT NULL DEFAULT 1,
  ar_osszesen REAL,
  fizetesi_mod TEXT NOT NULL DEFAULT 'Számla',
  szallitasi_cim TEXT,
  szallitasi_utca TEXT,
  szallitasi_irsz TEXT,
  szallitasi_varos TEXT,
  szallitasi_orszag TEXT,
  adoszam TEXT,
  szamlazasi_utca TEXT,
  szamlazasi_irsz TEXT,
  szamlazasi_varos TEXT,
  szamlazasi_orszag TEXT,
  megjegyzes TEXT,
  allapot TEXT NOT NULL DEFAULT 'Új',
  letrehozva TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  viszontelado_id INTEGER NOT NULL REFERENCES viszontelado(id),
  letrehozva TEXT NOT NULL DEFAULT (datetime('now')),
  lejar TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS password_resets (
  token TEXT PRIMARY KEY,
  viszontelado_id INTEGER NOT NULL REFERENCES viszontelado(id),
  letrehozva TEXT NOT NULL DEFAULT (datetime('now')),
  lejar TEXT NOT NULL,
  felhasznalva INTEGER NOT NULL DEFAULT 0
);

-- Saját eseménynapló (2026-09-19): minden üzleti esemény itt rögzül, a Meta-
-- továbbítás állapotával. event_id UNIQUE: ugyanaz az esemény kétszer nem rögzül.
-- meta_statusz: fuggoben | elkuldve | hiba | nincs_hozzajarulas | admin_nezet | nincs_meta_esemeny
CREATE TABLE IF NOT EXISTS measurement_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,
  event_name TEXT NOT NULL,
  meta_event_name TEXT,
  viszontelado_id INTEGER,
  par_id INTEGER,
  rendeles_id INTEGER,
  ertek REAL,
  penznem TEXT,
  adat TEXT,
  letrehozva TEXT NOT NULL DEFAULT (datetime('now')),
  meta_statusz TEXT NOT NULL DEFAULT 'fuggoben',
  meta_kiserletek INTEGER NOT NULL DEFAULT 0,
  meta_utolso_kiserlet TEXT,
  meta_valasz TEXT
);
CREATE INDEX IF NOT EXISTS idx_measurement_events_nev ON measurement_events (event_name, letrehozva);
CREATE INDEX IF NOT EXISTS idx_measurement_events_statusz ON measurement_events (meta_statusz);

-- Az alábbi oszlopok a régi CREATE TABLE-ök után ALTER-rel kerültek be (a fenti
-- táblák nem mutatják a teljes, éles sémát - a `PRAGMA table_info(<tábla>)` a mérvadó):
--   viszontelado: telefon, vezeteknev, keresztnev, adatkezeles_elfogadva,
--                 marketing_hozzajarulas (INTEGER NOT NULL DEFAULT 0), attribucio (JSON)
--   rendelesek:   mero_kontextus (JSON: friss fbp/fbc/IP/User-Agent a fizetés indításakor)

-- Emlékeztető emailek naplója (2026-09-19): egy sor = egy (oldal, típus) küldés.
-- tipus: emlekezteto_8h | emlekezteto_2h | lejart | torolve. UNIQUE (par_id, tipus):
-- ugyanaz az email kétszer nem megy ki. token: kattintás-követés és leiratkozás.
-- statusz: fuggoben | elkuldve | hiba. A viszontelado.emlekezteto_tiltva (0/1) a leiratkozás.
CREATE TABLE IF NOT EXISTS email_kuldesek (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  par_id INTEGER NOT NULL,
  viszontelado_id INTEGER NOT NULL,
  tipus TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  statusz TEXT NOT NULL DEFAULT 'fuggoben',
  kiserletek INTEGER NOT NULL DEFAULT 0,
  utolso_kiserlet TEXT,
  hiba TEXT,
  kuldve TEXT,
  kattintva TEXT,
  kattintasok INTEGER NOT NULL DEFAULT 0,
  letrehozva TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (par_id, tipus)
);
CREATE INDEX IF NOT EXISTS idx_email_kuldesek_viszontelado ON email_kuldesek (viszontelado_id);
