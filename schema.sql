CREATE TABLE IF NOT EXISTS parok (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  par_neve TEXT NOT NULL,
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
  letrehozva TEXT NOT NULL DEFAULT (datetime('now'))
);
