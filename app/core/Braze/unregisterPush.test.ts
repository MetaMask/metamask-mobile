import { NativeModules } from 'react-native';
import Logger from '../../util/Logger';
import StorageWrapper from '../../store/storage-wrapper';
import {
  BrazePushUnregistrationError,
  retryPendingBrazePushUnregistration,
  unregisterBrazePush,
} from './unregisterPush';
import { resetBrazePushOperationCoordinatorForTests } from './pushRegistrationState';

jest.mock('../../util/test/utils', () => ({
  hasTestOverrides: false,
}));

jest.mock('../../util/Logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItemSync: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

const mockUnregisterPush = jest.fn();
const mockStorageWrapper = jest.mocked(StorageWrapper);
let pendingValue: string | null;

describe('unregisterBrazePush', () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    pendingValue = null;
    resetBrazePushOperationCoordinatorForTests();
    mockStorageWrapper.getItemSync.mockImplementation(() => pendingValue);
    mockStorageWrapper.setItem.mockImplementation(async (_key, value) => {
      pendingValue = value;
    });
    mockStorageWrapper.removeItem.mockImplementation(async () => {
      pendingValue = null;
    });
    NativeModules.BrazePushModule = {
      unregisterPush: mockUnregisterPush,
    };
  });

  it('persists the intent and clears it after confirmed success', async () => {
    mockUnregisterPush.mockResolvedValue({ success: true });

    await expect(unregisterBrazePush()).resolves.toBe(true);

    expect(mockUnregisterPush).toHaveBeenCalledTimes(1);
    expect(mockStorageWrapper.setItem).toHaveBeenCalledTimes(1);
    expect(mockStorageWrapper.removeItem).toHaveBeenCalledTimes(1);
    expect(pendingValue).toBeNull();
    expect(Logger.log).toHaveBeenCalledWith(
      '[Braze] Unregistered this device from Braze push',
    );
  });

  it('keeps the intent pending after a retriable failure', async () => {
    mockUnregisterPush.mockResolvedValue({
      success: false,
      message: 'Rate limited',
      isRetriable: true,
    });

    await expect(unregisterBrazePush()).resolves.toBe(false);

    expect(mockUnregisterPush).toHaveBeenCalledTimes(1);
    expect(pendingValue).not.toBeNull();
  });

  it('retains a persisted intent after a permanent retry failure', async () => {
    pendingValue = 'true';
    mockUnregisterPush.mockResolvedValue({
      success: false,
      message: 'Unauthorized',
      isRetriable: false,
      httpStatusCode: 401,
    });

    await expect(retryPendingBrazePushUnregistration()).resolves.toBe(false);

    expect(pendingValue).not.toBeNull();
  });

  it('retries a persisted intent and clears it on success', async () => {
    pendingValue = 'true';
    mockUnregisterPush.mockResolvedValue({ success: true });

    await expect(retryPendingBrazePushUnregistration()).resolves.toBe(true);

    expect(mockUnregisterPush).toHaveBeenCalledTimes(1);
    expect(pendingValue).toBeNull();
  });

  it('throws a permanent native failure and removes the uncommitted intent', async () => {
    mockUnregisterPush.mockResolvedValue({
      success: false,
      message: 'Unauthorized',
      isRetriable: false,
      httpStatusCode: 401,
    });

    const error = await unregisterBrazePush().catch(
      (caughtError: unknown) => caughtError,
    );

    expect(error).toBeInstanceOf(BrazePushUnregistrationError);
    expect(error).toMatchObject({
      message: 'Unauthorized',
      isRetriable: false,
      httpStatusCode: 401,
    });
    expect(pendingValue).toBeNull();
  });

  it('throws when the native module is missing', async () => {
    delete NativeModules.BrazePushModule;

    await expect(unregisterBrazePush()).rejects.toThrow(
      'BrazePushModule is not available',
    );

    expect(pendingValue).toBeNull();
  });
});
