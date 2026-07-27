import type { CardProviderId } from '../provider-types';

const CURSOR_VERSION = 1;

interface CursorEnvelope {
  v: number;
  p: CardProviderId;
  d: unknown;
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
  return Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64url');
}

export function decodeCardCursor<T>(
  cursor: string,
  expectedProviderId: CardProviderId,
): T | null {
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf8');
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
