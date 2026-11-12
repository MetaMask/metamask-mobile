import { createOrderDispatchJournal, type OrderDispatchReference } from './orderDispatchJournal';
import type { PredictVenueId } from '../../types';

// ES2022 has no Promise.withResolvers; keep test barriers explicit.
const deferred = <Value,>() => {
  let resolve!: (value: Value | PromiseLike<Value>) => void;
  const promise = new Promise<Value>((done) => { resolve = done; });
  return { promise, resolve };
};

const reference: OrderDispatchReference = {
  identityScope: 'profile-one',
  venueId: 'kalshi' as PredictVenueId,
  previewId: 'preview-one',
  dispatchedAt: 1,
  recoveryState: 'unresolved',
};
const storageWith = () => {
  let value: string | null = null;
  return {
    getItem: jest.fn(async () => value),
    setItem: jest.fn(async (_key: string, next: string) => { value = next; }),
    removeItem: jest.fn(async () => { value = null; }),
  };
};

describe('order dispatch journal', () => {
  it('survives a fresh journal instance without expiry and isolates identities/venues', async () => {
    const storage = storageWith();
    const journal = createOrderDispatchJournal(storage);
    await journal.put(reference);
    await journal.put({ ...reference, identityScope: 'profile-two' });
    const restarted = createOrderDispatchJournal(storage);
    expect(await restarted.list('profile-one', reference.venueId)).toEqual([reference]);
    expect(await restarted.list('profile-three', reference.venueId)).toEqual([]);
    expect(await restarted.list('profile-one', 'other' as PredictVenueId)).toEqual([]);
  });

  it('persists only projected safe fields and merges the same preview', async () => {
    const storage = storageWith();
    const journal = createOrderDispatchJournal(storage);
    await journal.put({ ...reference, body: 'not-persisted', token: 'not-persisted' } as OrderDispatchReference);
    await journal.put({ ...reference, recoveryState: 'manual_review' });
    const saved = storage.setItem.mock.calls[1][1];
    expect(JSON.parse(saved)).toEqual({ v: 1, entries: [{ ...reference, recoveryState: 'manual_review' }] });
    expect(saved).not.toContain('not-persisted');
    expect(await journal.list('profile-one', reference.venueId)).toHaveLength(1);
  });

  it('serializes concurrent writes and removes only the named owner reference', async () => {
    const storage = storageWith();
    const journal = createOrderDispatchJournal(storage);
    await Promise.all([journal.put(reference), journal.put({ ...reference, previewId: 'preview-two' })]);
    await journal.remove('profile-other', reference.venueId, reference.previewId);
    expect(await journal.list('profile-one', reference.venueId)).toHaveLength(2);
    await journal.remove('profile-one', reference.venueId, reference.previewId);
    expect(await journal.list('profile-one', reference.venueId)).toEqual([{ ...reference, previewId: 'preview-two' }]);
  });

  it('fails closed on corrupted persistence instead of overwriting unknown orders', async () => {
    const storage = storageWith();
    storage.getItem.mockResolvedValue('{"v":1,"entries":[{"previewId":"lost"}]}');
    const journal = createOrderDispatchJournal(storage);
    await expect(journal.put(reference)).rejects.toThrow('Invalid Predict order dispatch journal');
    expect(storage.setItem).not.toHaveBeenCalled();
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
