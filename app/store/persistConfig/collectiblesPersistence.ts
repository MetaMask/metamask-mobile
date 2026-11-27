import { debounce } from 'lodash';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import Device from '../../util/device';
import { reportStorageWriteError } from '../../util/storage/diskSpaceError';

export const COLLECTIBLES_STORAGE_KEY = 'persist:CollectiblesController';
/** In-memory marker for a journal the controller must quarantine until wallet reset. */
export const UNREADABLE_COLLECTIBLES_JOURNAL = {
  unreadableJournal: true,
} as const;

const BACKUP_KEY = `${COLLECTIBLES_STORAGE_KEY}:backup`;

const isJournal = (value: string | undefined): value is string => {
  if (!value) return false;
  try {
    const journal: unknown = JSON.parse(value);
    return (
      journal !== null && typeof journal === 'object' && !Array.isArray(journal)
    );
  } catch {
    return false;
  }
};

// Background snapshots, migration writes and financial checkpoints share this
// queue. A failed write rejects its caller and leaves later attempts usable.
let previousWrite: Promise<void> = Promise.resolve();
const enqueue = async (operation: () => Promise<void>): Promise<void> => {
  const pending = previousWrite.then(operation);
  previousWrite = pending.catch((error: Error) => {
    reportStorageWriteError(error, {
      message: 'Failed to persist CollectiblesController state',
      key: COLLECTIBLES_STORAGE_KEY,
      source: 'persist_storage',
    });
  });
  return pending;
};

/** A native write can truncate the primary file before it finishes. */
const writeJournal = async (serialize: () => string): Promise<void> =>
  enqueue(async () => {
    const data = serialize();
    if (!isJournal(data))
      throw new Error('Invalid CollectiblesController journal');
    const current = await FilesystemStorage.getItem(COLLECTIBLES_STORAGE_KEY);
    if (isJournal(current)) {
      await FilesystemStorage.setItem(BACKUP_KEY, current, Device.isIos());
    }
    await FilesystemStorage.setItem(
      COLLECTIBLES_STORAGE_KEY,
      data,
      Device.isIos(),
    );
    await FilesystemStorage.removeItem(BACKUP_KEY);
  });

export const readCollectiblesJournal = async (): Promise<
  string | undefined
> => {
  await previousWrite;
  const current = await FilesystemStorage.getItem(COLLECTIBLES_STORAGE_KEY);
  if (isJournal(current)) return current;
  const backup = await FilesystemStorage.getItem(BACKUP_KEY);
  if (isJournal(backup)) return backup;
  if (current != null || backup != null)
    throw new Error('No valid CollectiblesController journal');
  return undefined;
};

export const scheduleCollectiblesWrite = debounce((state: unknown) => {
  void writeJournal(() => JSON.stringify(state)).catch(() => undefined);
}, 200);

export const persistCollectiblesNow = async (state: unknown): Promise<void> => {
  scheduleCollectiblesWrite.cancel();
  await writeJournal(() => JSON.stringify(state));
};

/** Controller migrations provide the already serialized journal. */
export const writeCollectiblesJournal = async (data: string): Promise<void> => {
  scheduleCollectiblesWrite.cancel();
  // Migrations write back every inflated controller. Keep the original bytes
  // when inflation could only supply the quarantine marker.
  if (data === JSON.stringify(UNREADABLE_COLLECTIBLES_JOURNAL)) return;
  await writeJournal(() => data);
};

export const removeCollectiblesJournal = async (): Promise<void> => {
  scheduleCollectiblesWrite.cancel();
  await enqueue(async () => {
    await FilesystemStorage.removeItem(BACKUP_KEY);
    await FilesystemStorage.removeItem(COLLECTIBLES_STORAGE_KEY);
  });
};
