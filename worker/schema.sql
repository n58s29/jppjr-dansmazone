-- schema.sql — base D1 pour "Dans Ma Zone" (connexion Strava)
-- Appliquer avec : wrangler d1 execute dans-ma-zone --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS athletes (
  id             INTEGER PRIMARY KEY,   -- identifiant athlète Strava
  firstname      TEXT,
  lastname       TEXT,
  access_token   TEXT NOT NULL,
  refresh_token  TEXT NOT NULL,
  expires_at     INTEGER NOT NULL,      -- epoch (secondes)
  scope          TEXT,
  connected_at   INTEGER NOT NULL,
  last_synced_at INTEGER                -- epoch de la dernière synchro complète (null = jamais)
);

CREATE TABLE IF NOT EXISTS activities (
  id               INTEGER PRIMARY KEY, -- identifiant activité Strava
  athlete_id       INTEGER NOT NULL REFERENCES athletes(id),
  name             TEXT,
  sport_type       TEXT,
  start_date_local TEXT,
  distance_m       REAL,
  points           TEXT NOT NULL        -- JSON [lat,lng,lat,lng,...] déjà sous-échantillonné (~1 pt/12m)
);
CREATE INDEX IF NOT EXISTS idx_activities_athlete ON activities(athlete_id);

CREATE TABLE IF NOT EXISTS sessions (
  session_id  TEXT PRIMARY KEY,
  athlete_id  INTEGER NOT NULL REFERENCES athletes(id),
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL
);
