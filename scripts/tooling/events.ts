import { execSync } from 'child_process';
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

/**
 * Extracts `owner/repo` from the git `origin` remote URL.
 * Returns null when the cwd is not a git repository or has no origin remote.
 */
function detectRepo(): string | null {
  try {
    const remote = execSync('git remote get-url origin', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    // Handles both SSH (git@github.com:owner/repo.git) and HTTPS formats
    const match = remote.match(/[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Writes a single tool-usage event to the local SQLite database.
 *
 * Intentionally silent on failure — this function must never interrupt
 * a developer workflow regardless of DB state or filesystem issues.
 */
export function trackEvent(params: TrackEventParams): void {
  let db: Database.Database | undefined;
  try {
    db = openDb(params.dbPath);

    db.prepare(`
      INSERT INTO events
        (event_id, tool_name, tool_type, event_type, repo, agent_vendor, success, duration_ms, metadata, created_at)
      VALUES
        (@event_id, @tool_name, @tool_type, @event_type, @repo, @agent_vendor, @success, @duration_ms, @metadata, @created_at)
    `).run({
      event_id: randomUUID(),
      tool_name: params.tool_name,
      tool_type: params.tool_type,
      event_type: params.event_type,
      repo: detectRepo(),
      agent_vendor: params.agent_vendor ?? null,
      // SQLite stores booleans as integers
      success: params.success != null ? (params.success ? 1 : 0) : null,
      duration_ms: params.duration_ms ?? null,
      metadata: params.metadata != null ? JSON.stringify(params.metadata) : null,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    // Write to stderr so failures are observable without interrupting any workflow
    process.stderr.write(
      `tool-usage-collection error: ${err instanceof Error ? err.message : String(err)}\n`,
    );
  } finally {
    // Always close — prevents descriptor leaks and WAL lock contention on repeated failures
    db?.close();
  }
}
