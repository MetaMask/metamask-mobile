import { NativeModules } from 'react-native';
import StorageWrapper from '../../store/storage-wrapper';
import {
  retryPendingBrazePushUnregistration,
  unregisterBrazePush,
} from './unregisterPush';
import { resetBrazePushOperationCoordinatorForTests } from './pushRegistrationState';
import {
  BRAZE_PUSH_DESIRED_STATE,
  BRAZE_PUSH_UNREGISTRATION_PENDING,
} from '../../constants/storage';

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
let desiredValue: string | null;

describe('unregisterBrazePush', () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    jest.resetAllMocks();
    pendingValue = null;
    desiredValue = null;
    resetBrazePushOperationCoordinatorForTests();
    mockStorageWrapper.getItemSync.mockImplementation((key) => {
      if (key === BRAZE_PUSH_UNREGISTRATION_PENDING) {
        return pendingValue;
      }
      if (key === BRAZE_PUSH_DESIRED_STATE) {
        return desiredValue;
      }
      return null;
    });
    mockStorageWrapper.setItem.mockImplementation(async (key, value) => {
      if (key === BRAZE_PUSH_UNREGISTRATION_PENDING) {
        pendingValue = value;
      }
      if (key === BRAZE_PUSH_DESIRED_STATE) {
        desiredValue = value;
      }
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
    expect(mockStorageWrapper.setItem).toHaveBeenCalledTimes(2);
    expect(mockStorageWrapper.removeItem).toHaveBeenCalledTimes(1);
    expect(pendingValue).toBeNull();
    expect(desiredValue).toBe('unregistered');
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

  it('preserves a newer registration intent while finishing a stale unregister', async () => {
    pendingValue = 'true';
    desiredValue = 'registered';
    mockUnregisterPush.mockResolvedValue({ success: true });

    await expect(retryPendingBrazePushUnregistration()).resolves.toBe(true);

    expect(desiredValue).toBe('registered');
    expect(pendingValue).toBeNull();
  });

  it('keeps the intent pending after a permanent native failure', async () => {
    mockUnregisterPush.mockResolvedValue({
      success: false,
      message: 'Unauthorized',
      isRetriable: false,
      httpStatusCode: 401,
    });

    await expect(unregisterBrazePush()).resolves.toBe(false);

    expect(pendingValue).toBe('true');
    expect(desiredValue).toBe('unregistered');
  });

  it('keeps the intent pending when the native module is missing', async () => {
    delete NativeModules.BrazePushModule;

    await expect(unregisterBrazePush()).resolves.toBe(false);

    expect(pendingValue).toBe('true');
  });
});
