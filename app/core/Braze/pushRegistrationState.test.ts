import StorageWrapper from '../../store/storage-wrapper';
import {
  clearPendingBrazePushUnregistration,
  hasPendingBrazePushUnregistrationSync,
  markBrazePushUnregistrationPending,
  resetBrazePushOperationCoordinatorForTests,
  runLatestBrazePushOperation,
} from './pushRegistrationState';

jest.mock('../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItemSync: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

const mockStorageWrapper = jest.mocked(StorageWrapper);

describe('Braze push registration state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetBrazePushOperationCoordinatorForTests();
  });

  it('persists and clears pending unregistration', async () => {
    await markBrazePushUnregistrationPending();
    await clearPendingBrazePushUnregistration();

    expect(mockStorageWrapper.setItem).toHaveBeenCalledWith(
      expect.any(String),
      'true',
    );
    expect(mockStorageWrapper.removeItem).toHaveBeenCalledWith(
      expect.any(String),
    );
  });

  it('reads pending state synchronously', () => {
    mockStorageWrapper.getItemSync.mockReturnValue('true');

    expect(hasPendingBrazePushUnregistrationSync()).toBe(true);
  });

  it('runs the latest different intent after an in-flight operation', async () => {
    let finishFirstOperation: (() => void) | undefined;
    const calls: string[] = [];
    const firstOperation = runLatestBrazePushOperation({
      key: 'unregister',
      supersededResult: undefined,
      operation: () =>
        new Promise<void>((resolve) => {
          calls.push('unregister-start');
          finishFirstOperation = () => {
            calls.push('unregister-finish');
            resolve();
          };
        }),
    });
    const secondOperation = runLatestBrazePushOperation({
      key: 'register:token',
      supersededResult: undefined,
      operation: async () => {
        calls.push('register');
      },
    });

    await Promise.resolve();
    expect(calls).toEqual(['unregister-start']);

    finishFirstOperation?.();
    await Promise.all([firstOperation, secondOperation]);

    expect(calls).toEqual([
      'unregister-start',
      'unregister-finish',
      'register',
    ]);
  });

  it('replaces a pending intent when the active intent becomes latest again', async () => {
    let finishUnregister: (() => void) | undefined;
    const registerOperation = jest.fn();
    const unregisterOperation = jest.fn(
      () =>
        new Promise<boolean>((resolve) => {
          finishUnregister = () => resolve(true);
        }),
    );

    const firstUnregister = runLatestBrazePushOperation({
      key: 'unregister',
      supersededResult: false,
      operation: unregisterOperation,
    });
    await Promise.resolve();
    const register = runLatestBrazePushOperation({
      key: 'register:token',
      supersededResult: undefined,
      operation: registerOperation,
    });
    const latestUnregister = runLatestBrazePushOperation({
      key: 'unregister',
      supersededResult: false,
      operation: unregisterOperation,
    });

    await expect(register).resolves.toBeUndefined();
    finishUnregister?.();
    await expect(
      Promise.all([firstUnregister, latestUnregister]),
    ).resolves.toEqual([true, true]);
    expect(unregisterOperation).toHaveBeenCalledTimes(1);
    expect(registerOperation).not.toHaveBeenCalled();
  });
});
