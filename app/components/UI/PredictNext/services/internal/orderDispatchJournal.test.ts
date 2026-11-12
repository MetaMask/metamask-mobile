import Logger from '../../../../../util/Logger';
import {
  createOrderDispatchJournal,
  type OrderDispatchReference,
} from './orderDispatchJournal';
import type { PredictVenueId } from '../../types';

jest.mock('../../../../../util/Logger', () => ({ error: jest.fn() }));

// ES2022 has no Promise.withResolvers; keep test barriers explicit.
const deferred = <Value>(): {
  promise: Promise<Value>;
  resolve: (value: Value | PromiseLike<Value>) => void;
} => {
  let resolve!: (value: Value | PromiseLike<Value>) => void;
  const promise = new Promise<Value>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const reference: OrderDispatchReference = {
  identityScope: 'profile-one',
  venueId: 'kalshi' as PredictVenueId,
  previewId: 'preview-one',
  dispatchedAt: 1,
  expiresAt: 30_000,
  recoveryState: 'unresolved',
};
const storageWith = (): {
  getItem: jest.Mock<Promise<string | null>, []>;
  setItem: jest.Mock<Promise<void>, [string, string]>;
  removeItem: jest.Mock<Promise<void>, []>;
} => {
  let value: string | null = null;
  return {
    getItem: jest.fn(async () => value),
    setItem: jest.fn(async (_key: string, next: string) => {
      value = next;
    }),
    removeItem: jest.fn(async () => {
      value = null;
    }),
  };
};

describe('order dispatch journal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('survives restart and isolates identities/venues', async () => {
    const storage = storageWith();
    const journal = createOrderDispatchJournal(storage);
    await journal.put(reference);
    await journal.put({ ...reference, identityScope: 'profile-two' });
    const restarted = createOrderDispatchJournal(storage);
    expect(await restarted.list('profile-one', reference.venueId)).toEqual([
      reference,
    ]);
    expect(await restarted.list('profile-three', reference.venueId)).toEqual(
      [],
    );
    expect(
      await restarted.list('profile-one', 'other' as PredictVenueId),
    ).toEqual([]);
  });

  it('persists only projected safe fields and merges the same preview', async () => {
    const storage = storageWith();
    const journal = createOrderDispatchJournal(storage);
    await journal.put({
      ...reference,
      body: 'not-persisted',
      token: 'not-persisted',
    } as OrderDispatchReference);
    await journal.put({ ...reference, recoveryState: 'manual_review' });
    const saved = storage.setItem.mock.calls[1][1];
    expect(JSON.parse(saved)).toEqual({
      v: 2,
      entries: [{ ...reference, recoveryState: 'manual_review' }],
    });
    expect(saved).not.toContain('not-persisted');
    expect(await journal.list('profile-one', reference.venueId)).toHaveLength(
      1,
    );
  });

  it('serializes concurrent writes and removes only the named owner reference', async () => {
    const storage = storageWith();
    const journal = createOrderDispatchJournal(storage);
    await Promise.all([
      journal.put(reference),
      journal.put({ ...reference, previewId: 'preview-two' }),
    ]);
    await journal.remove(
      'profile-other',
      reference.venueId,
      reference.previewId,
    );
    expect(await journal.list('profile-one', reference.venueId)).toHaveLength(
      2,
    );
    await journal.remove('profile-one', reference.venueId, reference.previewId);
    expect(await journal.list('profile-one', reference.venueId)).toEqual([
      { ...reference, previewId: 'preview-two' },
    ]);
  });

  it('quarantines invalid entries without losing valid v2 references or leaking payloads', async () => {
    const storage = storageWith();
    await storage.setItem('journal', JSON.stringify({
      v: 2,
      entries: [reference, { previewId: 'secret-corrupt-payload' }],
    }));
    const journal = createOrderDispatchJournal(storage);
    expect(await journal.list('profile-one', reference.venueId)).toEqual([reference]);
    expect(Logger.error).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(jest.mocked(Logger.error).mock.calls)).not.toContain('secret-corrupt-payload');
    const restarted = createOrderDispatchJournal(storage);
    await restarted.put({ ...reference, previewId: 'next' });
    expect(await restarted.list('profile-one', reference.venueId)).toEqual([
      reference, { ...reference, previewId: 'next' },
    ]);
    expect(Logger.error).toHaveBeenCalledTimes(1);
    expect(storage.setItem.mock.calls[1][1]).not.toContain('secret-corrupt-payload');
  });

  it('loads v1 references without inventing expiry and migrates on the next save', async () => {
    const storage = storageWith();
    const { expiresAt: _expiresAt, ...legacy } = reference;
    await storage.setItem('journal', JSON.stringify({ v: 1, entries: [legacy] }));
    const journal = createOrderDispatchJournal(storage);
    expect(await journal.list('profile-one', reference.venueId)).toEqual([legacy]);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    await journal.put({ ...reference, previewId: 'next' });
    expect(JSON.parse(storage.setItem.mock.calls[1][1])).toEqual({
      v: 2, entries: [legacy, { ...reference, previewId: 'next' }],
    });
  });

  it.each([NaN, Infinity, -1, 'invalid'])('refuses malformed expiry %s on put', async (expiresAt) => {
    const storage = storageWith();
    const journal = createOrderDispatchJournal(storage);
    await expect(journal.put({ ...reference, expiresAt } as OrderDispatchReference)).rejects.toThrow('Invalid Predict order dispatch reference');
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it.each(['not-json-secret', '{"v":9,"entries":[]}'])('quarantines an unreadable envelope and permits new dispatches', async (raw) => {
    const storage = storageWith();
    await storage.setItem('journal', raw);
    const journal = createOrderDispatchJournal(storage);
    await journal.put(reference);
    expect(await journal.list('profile-one', reference.venueId)).toEqual([reference]);
    expect(Logger.error).toHaveBeenCalledTimes(1);
    expect(storage.removeItem).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(jest.mocked(Logger.error).mock.calls)).not.toContain(raw);
  });

  it('fences an in-flight write and clears it before a new wallet writes', async () => {
    const storage = storageWith();
    const writeStarted = deferred<void>();
    const writeRelease = deferred<void>();
    const initialWrite = storage.setItem.getMockImplementation();
    storage.setItem.mockImplementationOnce(async (key, value) => {
      writeStarted.resolve();
      await writeRelease.promise;
      await initialWrite?.(key, value);
    });
    const journal = createOrderDispatchJournal(storage);
    const pending = journal.put(reference);
    await writeStarted.promise;
    const cleared = journal.clear();
    const next = journal.put({ ...reference, identityScope: 'new-wallet' });
    writeRelease.resolve();
    await expect(pending).rejects.toThrow('reset');
    await cleared;
    await next;
    expect(await journal.list('profile-one', reference.venueId)).toEqual([]);
    expect(await journal.list('new-wallet', reference.venueId)).toHaveLength(1);
  });
});
