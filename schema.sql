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
