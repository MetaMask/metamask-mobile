import fs from 'fs';
import os from 'os';
import path from 'path';
import { openDb, DEFAULT_DB_PATH, DEFAULT_DB_DIR } from './db';

describe('DEFAULT_DB_PATH', () => {
  it('points inside the home directory', () => {
    expect(DEFAULT_DB_PATH).toContain(os.homedir());
    expect(DEFAULT_DB_PATH).toContain('events.db');
    expect(DEFAULT_DB_DIR).toContain('.tool-usage-collection');
  });
});

describe('openDb', () => {
  it('creates the events table with all required columns', () => {
    const db = openDb(':memory:');

    const columns = db.prepare('PRAGMA table_info(events)').all() as {
      name: string;
    }[];
    const names = columns.map((c) => c.name);

    expect(names).toEqual([
      'event_id',
      'tool_name',
      'tool_type',
      'event_type',
      'repo',
      'agent_vendor',
      'success',
      'duration_ms',
      'metadata',
      'created_at',
    ]);

    db.close();
  });

  it('is idempotent — calling openDb twice on the same DB does not throw', () => {
    const tmpPath = path.join(
      os.tmpdir(),
      `tool-usage-idempotent-${Date.now()}.db`,
    );
    const db1 = openDb(tmpPath);
    db1.close();

    // A second open should apply CREATE TABLE IF NOT EXISTS without error
    const db2 = openDb(tmpPath);
    db2.close();

    fs.unlinkSync(tmpPath);
  });

  it('enforces the event_type CHECK constraint', () => {
    const db = openDb(':memory:');

    expect(() => {
      db
        .prepare(
          `INSERT INTO events
            (event_id, tool_name, tool_type, event_type, created_at)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run('id-1', 'my-tool', 'skill', 'invalid', new Date().toISOString());
    }).toThrow();

    db.close();
  });

  it('accepts valid event rows', () => {
    const db = openDb(':memory:');

    const event = {
      event_id: 'abc-123',
      tool_name: 'worktree-create',
      tool_type: 'skill',
      event_type: 'start',
      repo: 'MetaMask/metamask-mobile',
      agent_vendor: 'cursor',
      success: null,
      duration_ms: null,
      metadata: null,
      created_at: '2026-04-09T10:00:00.000Z',
    };

    db.prepare(`
      INSERT INTO events
        (event_id, tool_name, tool_type, event_type, repo, agent_vendor, success, duration_ms, metadata, created_at)
      VALUES
        (@event_id, @tool_name, @tool_type, @event_type, @repo, @agent_vendor, @success, @duration_ms, @metadata, @created_at)
    `).run(event);

    const row = db
      .prepare('SELECT * FROM events WHERE event_id = ?')
      .get('abc-123') as typeof event;

    expect(row).toMatchObject(event);

    db.close();
  });

  it('enforces PRIMARY KEY uniqueness', () => {
    const db = openDb(':memory:');

    const insert = db.prepare(
      `INSERT INTO events (event_id, tool_name, tool_type, event_type, created_at) VALUES (?, ?, ?, ?, ?)`,
    );
    insert.run('dup-id', 'tool', 'skill', 'start', new Date().toISOString());

    expect(() => {
      insert.run('dup-id', 'tool', 'skill', 'start', new Date().toISOString());
    }).toThrow();

    db.close();
  });

  it('creates the db directory when it does not exist', () => {
    const tmpDir = path.join(
      os.tmpdir(),
      `tool-usage-newdir-${Date.now()}`,
      'nested',
    );
    const tmpDb = path.join(tmpDir, 'events.db');

    expect(fs.existsSync(tmpDir)).toBe(false);

    const db = openDb(tmpDb);
    expect(fs.existsSync(tmpDb)).toBe(true);
    db.close();

    fs.rmSync(path.dirname(tmpDir), { recursive: true });
  });
});
