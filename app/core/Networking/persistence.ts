// shortcut: hand-rolled persister over StorageWrapper (MMKV); replace with the
// `persister` query option once query-core ships experimental_createPersister.
import { hashKey, type QueryKey } from '@tanstack/react-query';
import { type, number, unknown, is } from '@metamask/superstruct';
import StorageWrapper from '../../store/storage-wrapper';
import { CACHE_KEY_PREFIX, CACHE_TTL_MS } from './constants';
import { NetworkCache } from './types';

export interface StoredQuery<QueryFnData> {
  data: QueryFnData;
  savedAt: number;
}

const StoredEnvelopeSchema = type({ savedAt: number(), body: unknown() });

function storageKey(queryKey: QueryKey): string {
  return `${CACHE_KEY_PREFIX}${hashKey(queryKey)}`;
}

// Best effort: a failed write or delete only costs a later request.
async function save(key: string, value: string): Promise<void> {
  try {
    await StorageWrapper.setItem(key, value, { emitEvent: false });
  } catch {
    // ignored on purpose
  }
}

async function discard(key: string): Promise<void> {
  try {
    await StorageWrapper.removeItem(key);
  } catch {
    // ignored on purpose
  }
}

function parseEnvelope(raw: string): { savedAt: number; body: unknown } | null {
  try {
    const envelope: unknown = JSON.parse(raw);
    return is(envelope, StoredEnvelopeSchema) ? envelope : null;
  } catch {
    return null;
  }
}

/**
 * The response saved by an earlier session, run through `parse` again, or null
 * when there is none, it is older than the cache allows, or it no longer
 * passes `parse`. A rejected entry is deleted.
 */
export function readStoredQuery<QueryFnData>(
  queryKey: QueryKey,
  cache: NetworkCache,
  parse: (body: unknown) => QueryFnData,
  now = Date.now(),
): StoredQuery<QueryFnData> | null {
  if (cache === NetworkCache.NONE) return null;
  const key = storageKey(queryKey);
  const raw = StorageWrapper.getItemSync(key);
  if (!raw) return null;

  const envelope = parseEnvelope(raw);
  const age = envelope ? now - envelope.savedAt : -1;
  if (!envelope || age < 0 || age >= CACHE_TTL_MS[cache]) {
    void discard(key);
    return null;
  }
  try {
    return { data: parse(envelope.body), savedAt: envelope.savedAt };
  } catch {
    void discard(key);
    return null;
  }
}

/** Saves the raw body of a response that already passed `parse`. */
export function writeStoredQuery(
  queryKey: QueryKey,
  cache: NetworkCache,
  body: unknown,
  now = Date.now(),
): void {
  if (cache === NetworkCache.NONE) return;
  void save(storageKey(queryKey), JSON.stringify({ savedAt: now, body }));
}
