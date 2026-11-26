// shortcut: hand-rolled persister over StorageWrapper (MMKV); replace with the
// `persister` query option once query-core ships experimental_createPersister.
import { hashKey, type QueryKey } from '@tanstack/react-query';
import {
  type Infer,
  type,
  number,
  optional,
  string,
  unknown,
  is,
} from '@metamask/superstruct';
import StorageWrapper from '../../store/storage-wrapper';
import { CACHE_KEY_PREFIX, CACHE_TTL_MS } from './constants';
import { NetworkCache } from './types';

export interface StoredQuery<QueryFnData> {
  data: QueryFnData;
  savedAt: number;
}

const StoredEnvelopeSchema = type({
  savedAt: number(),
  body: unknown(),
  identity: optional(string()),
});

function storageKey(queryKey: QueryKey, slot?: string): string {
  if (slot !== undefined) return `${CACHE_KEY_PREFIX}slot:${slot}`;
  return `${CACHE_KEY_PREFIX}${hashKey(queryKey)}`;
}

function parseEnvelope(raw: string): Infer<typeof StoredEnvelopeSchema> | null {
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
  slot?: string,
): StoredQuery<QueryFnData> | null {
  if (cache === NetworkCache.NONE) return null;
  const key = storageKey(queryKey, slot);
  const raw = StorageWrapper.getItemSync(key);
  if (!raw) return null;

  const envelope = parseEnvelope(raw);
  const age = envelope ? now - envelope.savedAt : -1;
  if (!envelope || age < 0 || age >= CACHE_TTL_MS[cache]) {
    StorageWrapper.removeItem(key).catch(() => undefined);
    return null;
  }
  if (slot !== undefined && envelope.identity !== hashKey(queryKey))
    return null;
  try {
    return { data: parse(envelope.body), savedAt: envelope.savedAt };
  } catch {
    StorageWrapper.removeItem(key).catch(() => undefined);
    return null;
  }
}

/** Saves the raw body or its public projection after validation. */
export function writeStoredQuery(
  queryKey: QueryKey,
  cache: NetworkCache,
  body: unknown,
  now = Date.now(),
  slot?: string,
): void {
  if (cache === NetworkCache.NONE) return;
  const identity = slot === undefined ? undefined : hashKey(queryKey);
  StorageWrapper.setItem(
    storageKey(queryKey, slot),
    JSON.stringify({ savedAt: now, body, identity }),
    { emitEvent: false },
  ).catch(() => undefined);
}
