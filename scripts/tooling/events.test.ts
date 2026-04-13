import type Database from 'better-sqlite3';

jest.mock('./db', () => ({
  openDb: jest.fn(),
  DEFAULT_DB_PATH: '/mock/path/events.db',
  DEFAULT_DB_DIR: '/mock/path',
}));

import { openDb } from './db';
import { trackEvent } from './events';

describe('trackEvent', () => {
  const mockRun = jest.fn();
  const mockPrepare = jest.fn(() => ({ run: mockRun }));
  const mockClose = jest.fn();
  const mockDb = {
    prepare: mockPrepare,
    close: mockClose,
  } as unknown as Database.Database;

  beforeEach(() => {
    jest.mocked(openDb).mockReturnValue(mockDb);
    mockRun.mockReset();
    mockPrepare.mockReset();
    mockPrepare.mockReturnValue({ run: mockRun });
    mockClose.mockReset();
  });

  it('opens the DB and inserts an event with all required fields', () => {
    trackEvent({
      tool_name: 'worktree-create',
      tool_type: 'skill',
      event_type: 'start',
      agent_vendor: 'cursor',
    });

    expect(openDb).toHaveBeenCalledTimes(1);
    expect(mockPrepare).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO events'),
    );
    expect(mockRun).toHaveBeenCalledWith(
      expect.objectContaining({
        tool_name: 'worktree-create',
        tool_type: 'skill',
        event_type: 'start',
        agent_vendor: 'cursor',
      }),
    );
  });

  it('closes the DB after insertion', () => {
    trackEvent({ tool_name: 'test', tool_type: 'skill', event_type: 'start' });
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('generates a RFC 4122 UUID for event_id', () => {
    trackEvent({ tool_name: 'test', tool_type: 'skill', event_type: 'start' });

    const runArg = mockRun.mock.calls[0][0] as Record<string, unknown>;
    expect(runArg.event_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('sets created_at to the current ISO 8601 timestamp', () => {
    const before = new Date().toISOString();
    trackEvent({ tool_name: 'test', tool_type: 'skill', event_type: 'start' });
    const after = new Date().toISOString();

    const runArg = mockRun.mock.calls[0][0] as Record<string, unknown>;
    expect(runArg.created_at as string >= before).toBe(true);
    expect(runArg.created_at as string <= after).toBe(true);
  });

  it('always sets repo to MetaMask/metamask-mobile', () => {
    trackEvent({ tool_name: 'test', tool_type: 'skill', event_type: 'start' });

    const runArg = mockRun.mock.calls[0][0] as Record<string, unknown>;
    expect(runArg.repo).toBe('MetaMask/metamask-mobile');
  });

  it('maps success:true to integer 1', () => {
    trackEvent({
      tool_name: 'test',
      tool_type: 'skill',
      event_type: 'end',
      success: true,
    });

    const runArg = mockRun.mock.calls[0][0] as Record<string, unknown>;
    expect(runArg.success).toBe(1);
  });

  it('maps success:false to integer 0', () => {
    trackEvent({
      tool_name: 'test',
      tool_type: 'skill',
      event_type: 'end',
      success: false,
    });

    const runArg = mockRun.mock.calls[0][0] as Record<string, unknown>;
    expect(runArg.success).toBe(0);
  });

  it('leaves success as null when not provided', () => {
    trackEvent({ tool_name: 'test', tool_type: 'skill', event_type: 'start' });

    const runArg = mockRun.mock.calls[0][0] as Record<string, unknown>;
    expect(runArg.success).toBeNull();
  });

  it('JSON-serialises the metadata field', () => {
    trackEvent({
      tool_name: 'test',
      tool_type: 'skill',
      event_type: 'start',
      metadata: { branch: 'feat/foo', pr: 42 },
    });

    const runArg = mockRun.mock.calls[0][0] as Record<string, unknown>;
    expect(runArg.metadata).toBe('{"branch":"feat/foo","pr":42}');
  });

  it('leaves metadata as null when not provided', () => {
    trackEvent({ tool_name: 'test', tool_type: 'skill', event_type: 'start' });

    const runArg = mockRun.mock.calls[0][0] as Record<string, unknown>;
    expect(runArg.metadata).toBeNull();
  });

  it('passes dbPath to openDb when provided', () => {
    trackEvent({
      tool_name: 'test',
      tool_type: 'skill',
      event_type: 'start',
      dbPath: '/custom/path/events.db',
    });

    expect(openDb).toHaveBeenCalledWith('/custom/path/events.db');
  });

  it('does not throw when an error occurs', () => {
    jest.mocked(openDb).mockImplementation(() => {
      throw new Error('DB unavailable');
    });

    expect(() => {
      trackEvent({ tool_name: 'test', tool_type: 'skill', event_type: 'start' });
    }).not.toThrow();
  });

  it('writes the error message to stderr when an error occurs', () => {
    jest.mocked(openDb).mockImplementation(() => {
      throw new Error('DB unavailable');
    });

    const stderrWrite = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);

    trackEvent({ tool_name: 'test', tool_type: 'skill', event_type: 'start' });

    expect(stderrWrite).toHaveBeenCalledWith(
      expect.stringContaining('DB unavailable'),
    );

    stderrWrite.mockRestore();
  });

  it('closes the DB even when the insert throws', () => {
    mockPrepare.mockReturnValue({
      run: jest.fn().mockImplementation(() => {
        throw new Error('constraint violation');
      }),
    });

    const stderrWrite = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);

    trackEvent({ tool_name: 'test', tool_type: 'skill', event_type: 'start' });

    expect(mockClose).toHaveBeenCalledTimes(1);

    stderrWrite.mockRestore();
  });
});
