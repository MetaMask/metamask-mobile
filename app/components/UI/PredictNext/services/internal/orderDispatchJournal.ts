import type { PredictVenueId } from '../../types';

const JOURNAL_KEY = 'predict-next:order-dispatches:v1';

export type OrderRecoveryState = 'unresolved' | 'manual_review';

/** Safe references only. No approval, executable order or credential belongs
 * in this journal. Unknown dispatches have no expiry or pruning deadline. */
export interface OrderDispatchReference {
  identityScope: string;
  venueId: PredictVenueId;
  previewId: string;
  dispatchedAt: number;
  recoveryState: OrderRecoveryState;
}

export interface OrderJournalStorage {
  getItem(key: string): Promise<string | null | undefined>;
  setItem(key: string, value: string): Promise<unknown>;
  removeItem(key: string): Promise<unknown>;
}

export interface OrderDispatchJournal {
  list(identityScope: string, venueId: PredictVenueId): Promise<OrderDispatchReference[]>;
  put(reference: OrderDispatchReference): Promise<void>;
  remove(identityScope: string, venueId: PredictVenueId, previewId: string): Promise<void>;
  clear(): Promise<void>;
}

const validReference = (value: unknown): value is OrderDispatchReference => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const entry = value as Partial<OrderDispatchReference>;
  return (
    typeof entry.identityScope === 'string' && entry.identityScope.length > 0 &&
    typeof entry.venueId === 'string' && entry.venueId.length > 0 &&
    typeof entry.previewId === 'string' && entry.previewId.length > 0 &&
    typeof entry.dispatchedAt === 'number' && Number.isFinite(entry.dispatchedAt) &&
    entry.dispatchedAt >= 0 &&
    (entry.recoveryState === 'unresolved' || entry.recoveryState === 'manual_review')
  );
};

/** Deliberate field projection also prevents accidental callers from
 * persisting signed bodies or headers along with a reference. */
const safeReference = (entry: OrderDispatchReference): OrderDispatchReference => ({
  identityScope: entry.identityScope,
  venueId: entry.venueId,
  previewId: entry.previewId,
  dispatchedAt: entry.dispatchedAt,
  recoveryState: entry.recoveryState,
});

export const createOrderDispatchJournal = (
  storage: OrderJournalStorage,
): OrderDispatchJournal => {
  let queue: Promise<unknown> = Promise.resolve();
  let generation = 0;
  const serialized = <T>(task: () => Promise<T>): Promise<T> => {
    const result = queue.then(task, task);
    queue = result.catch(() => undefined);
    return result;
  };
  const load = async (): Promise<OrderDispatchReference[]> => {
    const raw = await storage.getItem(JOURNAL_KEY);
    if (!raw) {
      return [];
    }
    // Corruption is not an empty journal: failing closed prevents a new
    // mutation from overwriting references whose outcomes remain unknown.
    const file = JSON.parse(raw) as { v?: unknown; entries?: unknown };
    if (file.v !== 1 || !Array.isArray(file.entries) || !file.entries.every(validReference)) {
      throw new Error('Invalid Predict order dispatch journal.');
    }
    return file.entries.map(safeReference);
  };
  const save = async (entries: OrderDispatchReference[]): Promise<void> => {
    if (entries.length === 0) {
      await storage.removeItem(JOURNAL_KEY);
    } else {
      await storage.setItem(JOURNAL_KEY, JSON.stringify({ v: 1, entries }));
    }
  };
  return {
    list: (identityScope, venueId) => serialized(async () =>
      (await load()).filter((entry) =>
        entry.identityScope === identityScope && entry.venueId === venueId,
      ),
    ),
    put: (reference) => {
      const snapshot = safeReference(reference);
      if (!validReference(snapshot)) {
        return Promise.reject(new Error('Invalid Predict order dispatch reference.'));
      }
      const captured = generation;
      return serialized(async () => {
        const entries = await load();
        if (captured !== generation) {
          throw new Error('Predict order dispatch journal was reset.');
        }
        const index = entries.findIndex((entry) =>
          entry.identityScope === snapshot.identityScope &&
          entry.venueId === snapshot.venueId && entry.previewId === snapshot.previewId,
        );
        if (index < 0) {
          entries.push(snapshot);
        } else {
          entries[index] = snapshot;
        }
        await save(entries);
        if (captured !== generation) {
          throw new Error('Predict order dispatch journal was reset.');
        }
      });
    },
    remove: (identityScope, venueId, previewId) => serialized(async () => {
      const entries = await load();
      await save(entries.filter((entry) => !(
        entry.identityScope === identityScope && entry.venueId === venueId &&
        entry.previewId === previewId
      )));
    }),
    clear: () => {
      generation += 1;
      return serialized(async () => { await storage.removeItem(JOURNAL_KEY); });
    },
  };
};
