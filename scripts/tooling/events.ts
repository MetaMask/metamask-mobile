import { randomUUID } from 'crypto';
import type Database from 'better-sqlite3';
import { openDb } from './db';

export type EventType = 'start' | 'end';

export interface TrackEventParams {
  tool_name: string;
  tool_type: string;
  event_type: EventType;
  /** Which agent invoked the tool (e.g. 'cursor', 'claude', 'codex'). Null for human-initiated. */
  agent_vendor?: string;
  /** Only meaningful on 'end' events — whether the tool completed successfully. */
  success?: boolean;
  /** Only meaningful on 'end' events — elapsed time in milliseconds. */
  duration_ms?: number;
  /** Arbitrary key/value pairs to attach to the event. */
  metadata?: Record<string, unknown>;
  /** Override the DB path — intended for testing only. */
  dbPath?: string;
}
// The current project repo, needed if the DB is ever used by other projects
const REPO = 'MetaMask/metamask-mobile';

export interface TrackEventResult {
  event_id: string;
  created_at: string;
}

/**
 * Writes a single tool-usage event to the local SQLite database.
 *
 * Never throws — DB failures are written to stderr and the caller receives
 * `false` so callers that need accurate acknowledgement (e.g. the MCP server)
 * can distinguish a successful write from a silent failure.
 *
 * @returns The written `{ event_id, created_at }` on success, `false` on failure.
 */
export function trackEvent(params: TrackEventParams): TrackEventResult | false {
  let db: Database.Database | undefined;
  const event_id = randomUUID();
  const created_at = new Date().toISOString();
  try {
    db = openDb(params.dbPath);

    db.prepare(`
      INSERT INTO events
        (event_id, tool_name, tool_type, event_type, repo, agent_vendor, success, duration_ms, metadata, created_at)
      VALUES
        (@event_id, @tool_name, @tool_type, @event_type, @repo, @agent_vendor, @success, @duration_ms, @metadata, @created_at)
    `).run({
      event_id,
      tool_name: params.tool_name,
      tool_type: params.tool_type,
      event_type: params.event_type,
      repo: REPO,
      agent_vendor: params.agent_vendor ?? null,
      // SQLite stores booleans as integers
      success: params.success != null ? (params.success ? 1 : 0) : null,
      duration_ms: params.duration_ms ?? null,
      metadata: params.metadata != null ? JSON.stringify(params.metadata) : null,
      created_at,
    });
    return { event_id, created_at };
  } catch (err) {
    // Write to stderr so failures are observable without interrupting any workflow
    process.stderr.write(
      `tool-usage-collection error: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    return false;
  } finally {
    // Always close — prevents descriptor leaks and WAL lock contention on repeated failures
    db?.close();
  }
}
