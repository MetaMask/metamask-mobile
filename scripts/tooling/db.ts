import Database from 'better-sqlite3';
import fs from 'fs';
import os from 'os';
import path from 'path';

// babel-plugin-transform-inline-environment-variables statically replaces
// process.env.VAR_NAME at compile time. Routing through a dynamic key
// (`env[key]`) prevents inlining and preserves runtime override behaviour.
const getDbPath = (): string => {
  const env: Record<string, string | undefined> = process.env;
  return (
    env.TOOL_USAGE_COLLECTION_DB_PATH ??
    path.join(os.homedir(), '.tool-usage-collection', 'events.db')
  );
};

/**
 * Opens (or creates) the tool-usage SQLite database, initialises the schema,
 * and enables WAL mode for safe concurrent writes from multiple processes.
 *
 * Pass ':memory:' during tests to avoid touching the filesystem.
 */
export function openDb(dbPath = getDbPath()): Database.Database {
  // WAL journal mode requires a real file; skip dir creation and pragma for memory DBs
  const isMemory = dbPath === ':memory:';

  if (!isMemory) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new Database(dbPath);

  try {
    if (!isMemory) {
      db.pragma('journal_mode = WAL');
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        event_id     TEXT PRIMARY KEY,
        session_id   TEXT,
        tool_name    TEXT NOT NULL,
        tool_type    TEXT NOT NULL,
        event_type   TEXT NOT NULL CHECK(event_type IN ('start', 'end')),
        repo         TEXT,
        agent_vendor TEXT,
        success      INTEGER,
        duration_ms  INTEGER,
        metadata     TEXT,
        created_at   TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_events_session_id ON events (session_id);
    `);
  } catch (err) {
    db.close();
    throw err;
  }

  return db;
}
