CREATE TABLE IF NOT EXISTS event_sources (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  events_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  fetch_interval_minutes INTEGER NOT NULL DEFAULT 360,
  last_attempt_at INTEGER,
  last_success_at INTEGER,
  last_status_code INTEGER,
  last_error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS external_events (
  id TEXT PRIMARY KEY,
  source_code TEXT NOT NULL,
  source_event_id TEXT,
  canonical_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  start_at INTEGER,
  end_at INTEGER,
  registration_deadline INTEGER,
  venue_name TEXT,
  address TEXT,
  city TEXT,
  region TEXT,
  country TEXT,
  ruleset TEXT,
  event_format TEXT,
  registration_url TEXT,
  source_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published',
  raw_fingerprint TEXT NOT NULL,
  first_seen_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_external_events_source_start ON external_events(source_code,start_at);
CREATE INDEX IF NOT EXISTS idx_external_events_city_start ON external_events(city,start_at);
CREATE INDEX IF NOT EXISTS idx_external_events_last_seen ON external_events(last_seen_at);

CREATE TABLE IF NOT EXISTS event_ingestion_runs (
  id TEXT PRIMARY KEY,
  source_code TEXT NOT NULL,
  status TEXT NOT NULL,
  http_status INTEGER,
  discovered_count INTEGER NOT NULL DEFAULT 0,
  upserted_count INTEGER NOT NULL DEFAULT 0,
  error_code TEXT,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  started_at INTEGER NOT NULL,
  completed_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO event_sources (id,code,name,base_url,events_url,status,fetch_interval_minutes,created_at,updated_at) VALUES
('src_ibjjf','ibjjf','International Brazilian Jiu-Jitsu Federation','https://ibjjf.com','https://ibjjf.com/events','active',360,unixepoch()*1000,unixepoch()*1000),
('src_adcc','adcc','ADCC','https://adcombat.com','https://adcombat.com/adcc-events/','active',360,unixepoch()*1000,unixepoch()*1000),
('src_wjjl','wjjl','World Jiu-Jitsu League','https://www.wjjiujitsuleague.com','https://www.wjjiujitsuleague.com/events','active',360,unixepoch()*1000,unixepoch()*1000),
('src_agf','agf','American Grappling Federation','https://www.americangrapplingfederation.com','https://www.americangrapplingfederation.com/tournaments','active',360,unixepoch()*1000,unixepoch()*1000);
