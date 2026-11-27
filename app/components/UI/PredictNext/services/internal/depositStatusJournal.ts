import Logger from '../../../../../util/Logger';
import { parsePredictDepositOperation } from '../../contracts/v1/funding';
import type {
  PredictDepositOperation,
  PredictDepositStatus,
  PredictVenueId,
} from '../../types';

const JOURNAL_KEY = 'predict-next:deposit-status-journal:v1';

export interface UnresolvedDepositRef {
  operationId: string;
  lastStatus: PredictDepositStatus;
}

export interface DepositStatusSnapshot {
  unresolved: UnresolvedDepositRef[];
  notices: PredictDepositOperation[];
}

export interface DepositJournalStorage {
  getItem(key: string): Promise<string | null | undefined>;
  setItem(key: string, value: string): Promise<unknown>;
  removeItem(key: string): Promise<unknown>;
}

export interface DepositStatusJournal {
  load(
    identityScope: string,
    venueId: PredictVenueId,
  ): Promise<DepositStatusSnapshot>;
  save(
    identityScope: string,
    venueId: PredictVenueId,
    snapshot: DepositStatusSnapshot,
  ): Promise<void>;
  clear(): Promise<void>;
}

interface StoredScopeRecord {
  identityScope: string;
  venueId: PredictVenueId;
  unresolved: UnresolvedDepositRef[];
  notices: PredictDepositOperation[];
}

const VALID_UNRESOLVED_STATUSES: ReadonlySet<PredictDepositStatus> = new Set([
  'awaiting_transfer',
  'processing',
  'under_review',
]);

const isValidUnresolvedRef = (
  value: unknown,
): value is UnresolvedDepositRef => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const entry = value as Partial<UnresolvedDepositRef>;
  return (
    typeof entry.operationId === 'string' &&
    entry.operationId.length > 0 &&
    typeof entry.lastStatus === 'string' &&
    VALID_UNRESOLVED_STATUSES.has(entry.lastStatus)
  );
};

const parseNotice = (value: unknown): PredictDepositOperation | null => {
  try {
    const parsed = parsePredictDepositOperation(value);
    if (parsed.status !== 'failed' && parsed.status !== 'cancelled') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const isEmptySnapshot = (snapshot: DepositStatusSnapshot): boolean =>
  snapshot.unresolved.length === 0 && snapshot.notices.length === 0;

/**
 * Persists unresolved deposit IDs and unacknowledged terminal notices (`failed`,
 * `cancelled`) scoped by canonical Predict identity and Venue so completions
 * and failures survive app restart without leaking across accounts.
 */
export const createDepositStatusJournal = (
  storage: DepositJournalStorage,
): DepositStatusJournal => {
  let queue: Promise<unknown> = Promise.resolve();
  let generation = 0;

  const serialized = async <Result>(
    task: () => Promise<Result>,
  ): Promise<Result> => {
    const result = queue.then(task, task);
    queue = result.catch(() => undefined);
    return await result;
  };

  const writeRecords = async (records: StoredScopeRecord[]): Promise<void> => {
    const nonEmpty = records.filter(
      (record) => record.unresolved.length > 0 || record.notices.length > 0,
    );
    if (nonEmpty.length === 0) {
      await storage.removeItem(JOURNAL_KEY);
    } else {
      await storage.setItem(
        JOURNAL_KEY,
        JSON.stringify({ v: 1, scopes: nonEmpty }),
      );
    }
  };

  const readRecords = async (): Promise<StoredScopeRecord[]> => {
    const raw = await storage.getItem(JOURNAL_KEY);
    if (!raw) {
      return [];
    }
    let file: { v?: unknown; scopes?: unknown };
    try {
      file = JSON.parse(raw);
    } catch {
      Logger.error(
        new Error('Invalid JSON in Predict deposit status journal.'),
        'PredictNext: quarantined deposit status journal',
      );
      await writeRecords([]);
      return [];
    }
    if (file?.v !== 1 || !Array.isArray(file.scopes)) {
      Logger.error(
        new Error('Invalid Predict deposit status journal envelope.'),
        'PredictNext: quarantined deposit status journal',
      );
      await writeRecords([]);
      return [];
    }
    const records: StoredScopeRecord[] = [];
    for (const rawScope of file.scopes) {
      if (typeof rawScope !== 'object' || rawScope === null) {
        continue;
      }
      const entry = rawScope as {
        identityScope?: unknown;
        venueId?: unknown;
        unresolved?: unknown;
        notices?: unknown;
      };
      if (
        typeof entry.identityScope !== 'string' ||
        entry.identityScope.length === 0 ||
        typeof entry.venueId !== 'string' ||
        entry.venueId.length === 0
      ) {
        continue;
      }
      const unresolved: UnresolvedDepositRef[] = Array.isArray(entry.unresolved)
        ? entry.unresolved.filter(isValidUnresolvedRef).map((item) => ({
            operationId: item.operationId,
            lastStatus: item.lastStatus,
          }))
        : [];
      const notices: PredictDepositOperation[] = Array.isArray(entry.notices)
        ? entry.notices
            .map(parseNotice)
            .filter(
              (notice): notice is PredictDepositOperation => notice !== null,
            )
        : [];
      if (unresolved.length > 0 || notices.length > 0) {
        records.push({
          identityScope: entry.identityScope,
          venueId: entry.venueId as PredictVenueId,
          unresolved,
          notices,
        });
      }
    }
    return records;
  };

  return {
    load: async (identityScope, venueId): Promise<DepositStatusSnapshot> =>
      await serialized(async () => {
        const records = await readRecords();
        const match = records.find(
          (record) =>
            record.identityScope === identityScope &&
            record.venueId === venueId,
        );
        return match
          ? {
              unresolved: match.unresolved.map((item) => ({ ...item })),
              notices: [...match.notices],
            }
          : { unresolved: [], notices: [] };
      }),
    save: async (identityScope, venueId, snapshot): Promise<void> => {
      if (!identityScope) {
        return;
      }
      const captured = generation;
      const sanitized: DepositStatusSnapshot = {
        unresolved: snapshot.unresolved
          .filter(isValidUnresolvedRef)
          .map((item) => ({
            operationId: item.operationId,
            lastStatus: item.lastStatus,
          })),
        notices: snapshot.notices
          .map(parseNotice)
          .filter(
            (notice): notice is PredictDepositOperation => notice !== null,
          ),
      };
      await serialized(async () => {
        if (captured !== generation) {
          return;
        }
        const records = await readRecords();
        if (captured !== generation) {
          return;
        }
        const filtered = records.filter(
          (record) =>
            !(
              record.identityScope === identityScope &&
              record.venueId === venueId
            ),
        );
        if (!isEmptySnapshot(sanitized)) {
          filtered.push({
            identityScope,
            venueId,
            unresolved: sanitized.unresolved,
            notices: sanitized.notices,
          });
        }
        await writeRecords(filtered);
      });
    },
    clear: async (): Promise<void> => {
      generation += 1;
      await serialized(async () => {
        await storage.removeItem(JOURNAL_KEY);
      });
    },
  };
};
