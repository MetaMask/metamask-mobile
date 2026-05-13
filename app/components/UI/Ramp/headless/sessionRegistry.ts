import Logger from '../../../../util/Logger';
import type {
  CloseSessionOptions,
  HeadlessBuyCallbacks,
  HeadlessBuyCloseInfo,
  HeadlessBuyError,
  HeadlessBuyErrorCode,
  HeadlessBuyParams,
  HeadlessSession,
  HeadlessSessionStatus,
} from './types';

const HEADLESS_BUY_ERROR_CODES: ReadonlySet<HeadlessBuyErrorCode> = new Set([
  'NO_QUOTES',
  'LIMIT_EXCEEDED',
  'KYC_REQUIRED',
  'AUTH_FAILED',
  'QUOTE_FAILED',
  'USER_CANCELLED',
  'UNKNOWN',
]);

function isTerminalSessionStatus(status: HeadlessSessionStatus): boolean {
  return (
    status === 'completed' || status === 'cancelled' || status === 'failed'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isHeadlessBuyErrorCode(value: unknown): value is HeadlessBuyErrorCode {
  return (
    typeof value === 'string' &&
    HEADLESS_BUY_ERROR_CODES.has(value as HeadlessBuyErrorCode)
  );
}

function getErrorMessage(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.message;
  }
  if (isRecord(error) && typeof error.message === 'string') {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return undefined;
}

export function toHeadlessBuyError(
  error: unknown,
  fallbackCode: HeadlessBuyErrorCode = 'UNKNOWN',
): HeadlessBuyError {
  if (isRecord(error)) {
    const explicitCode = isHeadlessBuyErrorCode(error.headlessBuyErrorCode)
      ? error.headlessBuyErrorCode
      : isHeadlessBuyErrorCode(error.code)
        ? error.code
        : undefined;

    if (explicitCode) {
      return {
        code: explicitCode,
        message: getErrorMessage(error),
        details: isRecord(error.details) ? error.details : undefined,
      };
    }
  }

  if (error instanceof Error && error.name === 'LimitExceededError') {
    return {
      code: 'LIMIT_EXCEEDED',
      message: error.message,
    };
  }

  return {
    code: fallbackCode,
    message: getErrorMessage(error),
  };
}

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
 * `getSession(route.params?.headlessSessionId)?.callbacks.onOrderCreated(id, order)`
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
 * Returns the id of the first non-terminal session, if any. Used by
 * `startHeadlessBuy` to enforce a "single live session at a time" policy:
 * starting a new session auto-cancels the previous one (Phase 5).
 *
 * Sessions are iterated in insertion order, but the registry only ever
 * carries one live session under correct usage, so this is effectively
 * O(1) in practice.
 */
export function getActiveSessionId(): string | undefined {
  for (const [id, session] of sessions) {
    if (!isTerminalSessionStatus(session.status)) {
      return id;
    }
  }
  return undefined;
}

/**
 * Idempotent "stop and notify" used by both consumer-driven cancellation
 * and the auto-cancel path of `startHeadlessBuy`.
 *
 * - Marks the session `cancelled` (if it isn't already terminal).
 * - Removes it from the registry so subsequent `getSession(id)` returns `undefined` and lookups in downstream screens become no-ops.
 * - Fires `onClose(info)` exactly once.
 *
 * Safe to call with an unknown id — does nothing in that case so callers
 * don't have to null-check.
 *
 * If `onClose` throws, the error is logged: the session is already removed
 * from the map, but operators need visibility when a consumer handler breaks.
 */
export function closeSession(
  id: string | undefined,
  info: HeadlessBuyCloseInfo,
  options?: CloseSessionOptions,
): void {
  if (!id) {
    return;
  }
  const session = sessions.get(id);
  if (!session) {
    return;
  }
  if (!isTerminalSessionStatus(session.status)) {
    session.status =
      options?.terminalStatus === 'failed' ? 'failed' : 'cancelled';
  }
  sessions.delete(id);
  try {
    session.callbacks.onClose(info);
  } catch (e) {
    Logger.error(
      e instanceof Error ? e : new Error(String(e)),
      'headless sessionRegistry: onClose callback threw',
    );
  }
}

/**
 * Idempotent "fail and notify" for unrecoverable headless errors. It turns
 * thrown/native errors into the public HeadlessBuyError shape, fires `onError`,
 * then terminates the session through `closeSession`.
 */
export function failSession(
  id: string | undefined,
  error: unknown,
  fallbackCode: HeadlessBuyErrorCode = 'UNKNOWN',
): HeadlessBuyError | undefined {
  if (!id) {
    return undefined;
  }
  const session = sessions.get(id);
  if (!session) {
    return undefined;
  }
  const headlessError = toHeadlessBuyError(error, fallbackCode);
  try {
    session.callbacks.onError(headlessError);
  } catch (e) {
    Logger.error(
      e instanceof Error ? e : new Error(String(e)),
      'headless sessionRegistry: onError callback threw',
    );
  }
  closeSession(
    id,
    { reason: 'unknown' },
    {
      terminalStatus: 'failed',
    },
  );
  return headlessError;
}

/**
 * Test-only helper. Resets registry state between tests so they do not leak
 * sessions into one another.
 */
export function __resetSessionRegistryForTests(): void {
  sessions.clear();
  idCounter = 0;
}
