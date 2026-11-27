import { createDeferredPromise } from '@metamask/utils';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import {
  COLLECTIBLES_STORAGE_KEY,
  persistCollectiblesNow,
  readCollectiblesJournal,
  removeCollectiblesJournal,
  scheduleCollectiblesWrite,
} from './collectiblesPersistence';

jest.mock('redux-persist-filesystem-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));
jest.mock('../../util/storage/diskSpaceError', () => ({
  reportStorageWriteError: jest.fn(),
}));
jest.mock('../../util/device', () => ({ isIos: () => true }));

const BACKUP_KEY = `${COLLECTIBLES_STORAGE_KEY}:backup`;

const setupFiles = (initial: Record<string, string>) => {
  const files = new Map(Object.entries(initial));
  jest
    .mocked(FilesystemStorage.getItem)
    .mockImplementation(async (key) => files.get(key));
  jest
    .mocked(FilesystemStorage.setItem)
    .mockImplementation(async (key, value) => {
      files.set(key, value);
    });
  jest.mocked(FilesystemStorage.removeItem).mockImplementation(async (key) => {
    files.delete(key);
    return undefined;
  });
  return files;
};

afterEach(() => {
  jest.resetAllMocks();
});

it('serializes checkpoints behind in-flight writes and cancels obsolete delayed snapshots', async () => {
  jest.useFakeTimers();
  try {
    const started = createDeferredPromise<void>();
    const release = createDeferredPromise<void>();
    const write = jest.mocked(FilesystemStorage.setItem);
    write.mockImplementationOnce(async () => {
      started.resolve();
      await release.promise;
    });
    scheduleCollectiblesWrite({ version: 1 });
    jest.advanceTimersByTime(200);
    await started.promise;
    scheduleCollectiblesWrite({ version: 2 });

    const checkpoint = persistCollectiblesNow({ version: 3 });
    jest.advanceTimersByTime(200);
    expect(write).toHaveBeenCalledTimes(1);
    release.resolve();
    await checkpoint;

    expect(write.mock.calls.map(([, data]) => data)).toEqual([
      '{"version":1}',
      '{"version":3}',
    ]);
  } finally {
    jest.useRealTimers();
  }
});

it('propagates native write failure and allows the next checkpoint to persist', async () => {
  jest
    .mocked(FilesystemStorage.setItem)
    .mockRejectedValueOnce(new Error('disk full'));
  await expect(persistCollectiblesNow({ version: 1 })).rejects.toThrow(
    'disk full',
  );
  await expect(persistCollectiblesNow({ version: 2 })).resolves.toBeUndefined();
});

it('restores the last acknowledged journal after an interrupted native write', async () => {
  const saved = JSON.stringify({
    packPartner: { operations: { memo: 'submitted' } },
  });
  const files = setupFiles({ [COLLECTIBLES_STORAGE_KEY]: saved });
  jest
    .mocked(FilesystemStorage.setItem)
    .mockImplementation(async (key, value) => {
      if (key === COLLECTIBLES_STORAGE_KEY) {
        files.set(key, value.slice(0, -1));
        throw new Error('Interrupted');
      }
      files.set(key, value);
    });

  const write = persistCollectiblesNow({ packPartner: { operations: {} } });

  await expect(write).rejects.toThrow('Interrupted');
  await expect(readCollectiblesJournal()).resolves.toBe(saved);
});

it('preserves a good backup through a second interrupted write to a truncated primary', async () => {
  const saved = '{"version":1}';
  const files = setupFiles({
    [COLLECTIBLES_STORAGE_KEY]: '{"state":',
    [BACKUP_KEY]: saved,
  });
  jest
    .mocked(FilesystemStorage.setItem)
    .mockRejectedValue(new Error('Disk full'));

  const write = persistCollectiblesNow({ version: 2 });

  await expect(write).rejects.toThrow('Disk full');
  expect(files.get(BACKUP_KEY)).toBe(saved);
  expect(FilesystemStorage.setItem).not.toHaveBeenCalledWith(
    BACKUP_KEY,
    expect.anything(),
    true,
  );
});

it('keeps the primary intact when writing the safety copy fails', async () => {
  const saved = '{"version":1}';
  const files = setupFiles({ [COLLECTIBLES_STORAGE_KEY]: saved });
  jest
    .mocked(FilesystemStorage.setItem)
    .mockRejectedValue(new Error('Backup failed'));

  const write = persistCollectiblesNow({ version: 2 });

  await expect(write).rejects.toThrow('Backup failed');
  expect(files.get(COLLECTIBLES_STORAGE_KEY)).toBe(saved);
  expect(FilesystemStorage.setItem).not.toHaveBeenCalledWith(
    COLLECTIBLES_STORAGE_KEY,
    expect.anything(),
    true,
  );
});

it('removes the old wallet backup after checkpointing a reset', async () => {
  const files = setupFiles({ [BACKUP_KEY]: '{"old":true}' });
  const reset = { packPartner: { operations: {}, sales: {} } };

  await persistCollectiblesNow(reset);

  expect(Object.fromEntries(files)).toEqual({
    [COLLECTIBLES_STORAGE_KEY]: JSON.stringify(reset),
  });
});

it('removes both copies when a migration deletes the controller', async () => {
  const files = setupFiles({
    [COLLECTIBLES_STORAGE_KEY]: '{"new":true}',
    [BACKUP_KEY]: '{"old":true}',
  });

  await removeCollectiblesJournal();

  expect(files.size).toBe(0);
});
