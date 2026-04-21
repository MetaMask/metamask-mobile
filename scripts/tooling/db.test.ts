import fs from 'fs';
import os from 'os';
import path from 'path';
import { openDb } from './db';

// mockDb is used for all non-:memory: openDb calls to avoid real fs side effects
const mockDb = {
  pragma: jest.fn(),
  exec: jest.fn(),
  close: jest.fn(),
};

// :memory: paths use the real SQLite engine (for schema/constraint tests);
// file paths return mockDb so no real files are created
jest.mock('better-sqlite3', () => {
  const RealDatabase = jest.requireActual('better-sqlite3');
  return jest
    .fn()
    .mockImplementation((dbPath: string) =>
      dbPath === ':memory:' ? new RealDatabase(dbPath) : mockDb,
    );
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('openDb default path', () => {
  // The jest.fn() inside the jest.mock factory is not tracked by jest.clearAllMocks(),
  // so we clear it explicitly before each test.
  const DatabaseCtor = jest.requireMock<jest.Mock>('better-sqlite3');

  beforeEach(() => {
    DatabaseCtor.mockClear();
  });

  afterEach(() => {
    delete process.env.TOOL_USAGE_COLLECTION_DB_PATH;
  });

  it('defaults to ~/.tool-usage-collection/events.db when env var is not set', () => {
    delete process.env.TOOL_USAGE_COLLECTION_DB_PATH;
    jest.spyOn(fs, 'existsSync').mockReturnValueOnce(true);

    openDb();

    const calledPath = DatabaseCtor.mock.calls[0][0] as string;
    expect(calledPath).toContain(os.homedir());
    expect(calledPath).toContain(path.join('.tool-usage-collection', 'events.db'));
  });

  it('uses TOOL_USAGE_COLLECTION_DB_PATH when the env var is set', () => {
    const customPath = '/custom/path/mydb.db';
    process.env.TOOL_USAGE_COLLECTION_DB_PATH = customPath;
    jest.spyOn(fs, 'existsSync').mockReturnValueOnce(true);

    openDb();

    expect(DatabaseCtor.mock.calls[0][0]).toBe(customPath);
  });
});

describe('openDb', () => {
  it('creates the events table with all required columns', () => {
    const db = openDb(':memory:');

    const columns = db.prepare('PRAGMA table_info(events)').all() as {
      name: string;
    }[];
    expect(columns.map((c) => c.name)).toEqual([
      'event_id',
      'session_id',
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

  it('creates the idx_events_session_id index on session_id', () => {
    const db = openDb(':memory:');

    const indexes = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'events'`,
      )
      .all() as { name: string }[];
    expect(indexes.map((i) => i.name)).toContain('idx_events_session_id');

    db.close();
  });

  it('enforces the event_type CHECK constraint', () => {
    const db = openDb(':memory:');

    expect(() => {
      db
        .prepare(
          `INSERT INTO events (event_id, tool_name, tool_type, event_type, created_at)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run('id-1', 'my-tool', 'skill', 'invalid', new Date().toISOString());
    }).toThrow();

    db.close();
  });

  it('accepts valid event rows including session_id', () => {
    const db = openDb(':memory:');

    const event = {
      event_id: 'abc-123',
      session_id: 'session-abc-123',
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
        (event_id, session_id, tool_name, tool_type, event_type, repo, agent_vendor, success, duration_ms, metadata, created_at)
      VALUES
        (@event_id, @session_id, @tool_name, @tool_type, @event_type, @repo, @agent_vendor, @success, @duration_ms, @metadata, @created_at)
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

  // ── Filesystem / behavior tests — mockDb via file paths ───────────────────

  it('enables WAL mode for file-based DBs', () => {
    const existsSpy = jest.spyOn(fs, 'existsSync').mockReturnValueOnce(true);

    openDb('/some/path/events.db');

    expect(mockDb.pragma).toHaveBeenCalledWith('journal_mode = WAL');

    existsSpy.mockRestore();
  });

  it('closes the handle and re-throws when schema setup fails', () => {
    const execError = new Error('exec failed');
    mockDb.exec.mockImplementationOnce(() => {
      throw execError;
    });
    const existsSpy = jest.spyOn(fs, 'existsSync').mockReturnValueOnce(true);

    expect(() => openDb('/some/path/events.db')).toThrow(execError);
    expect(mockDb.close).toHaveBeenCalledTimes(1);

    existsSpy.mockRestore();
  });

  it('creates the db directory when it does not exist', () => {
    const dbPath = '/nonexistent/dir/events.db';
    const dbDir = path.dirname(dbPath);

    const existsSpy = jest
      .spyOn(fs, 'existsSync')
      .mockReturnValueOnce(false);
    const mkdirSpy = jest
      .spyOn(fs, 'mkdirSync')
      .mockImplementationOnce(() => undefined);

    openDb(dbPath);

    expect(existsSpy).toHaveBeenCalledWith(dbDir);
    expect(mkdirSpy).toHaveBeenCalledWith(dbDir, { recursive: true });

    existsSpy.mockRestore();
    mkdirSpy.mockRestore();
  });

});
