import type { CardProviderId } from '../provider-types';

const CURSOR_VERSION = 1;

/**
 * Versioned envelope wrapping a provider-specific pagination payload. The
 * cursor is opaque to consumers; the provider id and version guard against
 * replaying a cursor across providers or across incompatible cursor formats.
 */
interface CursorEnvelope {
  v: number;
  p: CardProviderId;
  d: unknown;
}

// Manual base64url transform: the React Native `buffer` polyfill does not
// reliably support the 'base64url' encoding across versions.
function toBase64Url(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/[=]+$/u, '');
}

function fromBase64Url(base64url: string): string {
  return base64url.replace(/-/g, '+').replace(/_/g, '/');
}

export function encodeCardCursor(
  providerId: CardProviderId,
  payload: unknown,
): string {
  const envelope: CursorEnvelope = {
    v: CURSOR_VERSION,
    p: providerId,
    d: payload,
  };
  return toBase64Url(
    Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64'),
  );
}

/**
 * Decodes a cursor produced by {@link encodeCardCursor}. Returns `null` for
 * malformed cursors, version mismatches, or cursors issued by a different
 * provider, so callers can treat any invalid cursor as "start from the top".
 */
export function decodeCardCursor<T>(
  cursor: string,
  expectedProviderId: CardProviderId,
): T | null {
  try {
    const json = Buffer.from(fromBase64Url(cursor), 'base64').toString('utf8');
    const envelope = JSON.parse(json) as CursorEnvelope;
    if (
      envelope.v !== CURSOR_VERSION ||
      envelope.p !== expectedProviderId ||
      envelope.d === undefined
    ) {
      return null;
    }
    return envelope.d as T;
  } catch {
    return null;
  }
}
