import type {
  HeadlessBuyCallbacks,
  HeadlessBuyParams,
  HeadlessSession,
  HeadlessSessionStatus,
} from './types';

/**
 * Module-level registry that holds the live headless buy sessions. Sessions
 * carry non-serializable callbacks and therefore cannot live in Redux nor in
 * navigation params — only the `sessionId` travels through navigation, and
 * downstream screens look the session up by id.
 *
 * This mirrors the established MetaMask pattern of an id-keyed in-memory
 * "request → resolve later" registry (see
 * `app/core/SDKConnectV2/services/connection-registry.ts` and
 * `@metamask/approval-controller`).
 *
 * Phase 3 introduces the registry plus `createSession` / `getSession` /
 * `setStatus` / `endSession`. Later phases will read from it inside the
 * existing routing helpers to fire the consumer's `onOrderCreated` callback
 * instead of navigating to the order-processing screen.
 */
const sessions = new Map<string, HeadlessSession>();

/**
 * Sessions that have not been touched after this many ms are considered
 * abandoned and garbage-collected on the next `createSession` call. This
 * stops misuse of the API from leaking memory if a consumer never calls
 * `cancel()`.
 */
const STALE_SESSION_TTL_MS = 60 * 60 * 1000;

let idCounter = 0;

function generateSessionId(): string {
  idCounter += 1;
  return `headless-buy-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

function gcStaleSessions(now: number): void {
  for (const [id, session] of sessions) {
    if (now - session.createdAt > STALE_SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
}

export function createSession(
  params: HeadlessBuyParams,
  callbacks: HeadlessBuyCallbacks,
): HeadlessSession {
  const now = Date.now();
  gcStaleSessions(now);
  const session: HeadlessSession = {
    id: generateSessionId(),
    status: 'pending',
    params,
    callbacks,
    createdAt: now,
  };
  sessions.set(session.id, session);
  return session;
}

/**
 * Looks up a live session by id. Returns `undefined` for unknown ids and for
 * `undefined` itself, so consumers can write
 * `getSession(route.params?.headlessSessionId)?.callbacks.onOrderCreated(id)`
 * without any extra null-checking.
 */
export function getSession(
  id: string | undefined,
): HeadlessSession | undefined {
  if (!id) {
    return undefined;
  }
  return sessions.get(id);
}

export function setStatus(id: string, status: HeadlessSessionStatus): void {
  const session = sessions.get(id);
  if (!session) {
    return;
  }
  session.status = status;
}

export function endSession(id: string): void {
  sessions.delete(id);
}

/**
 * Test-only helper. Resets registry state between tests so they do not leak
 * sessions into one another.
 */
export function __resetSessionRegistryForTests(): void {
  sessions.clear();
  idCounter = 0;
}
