import { NativeModules } from 'react-native';
import StorageWrapper from '../../store/storage-wrapper';
import {
  retryPendingBrazePushUnregistration,
  unregisterBrazePush,
} from './unregisterPush';
import { BRAZE_PUSH_REGISTRATION_STATE } from '../../constants/storage';

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
  },
}));

const mockUnregisterPush = jest.fn();
const mockStorageWrapper = jest.mocked(StorageWrapper);
let registrationState: string | null;

describe('unregisterBrazePush', () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    jest.resetAllMocks();
    registrationState = null;
    mockStorageWrapper.getItemSync.mockImplementation((key) => {
      if (key === BRAZE_PUSH_REGISTRATION_STATE) {
        return registrationState;
      }
      return null;
    });
    mockStorageWrapper.setItem.mockImplementation(async (key, value) => {
      if (key === BRAZE_PUSH_REGISTRATION_STATE) {
        registrationState = value;
      }
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
    expect(registrationState).toBe('unregistered');
  });

  it('keeps the intent pending after a native failure', async () => {
    mockUnregisterPush.mockResolvedValue({
      success: false,
      message: 'Request failed',
    });

    await expect(unregisterBrazePush()).resolves.toBe(false);

    expect(mockUnregisterPush).toHaveBeenCalledTimes(1);
    expect(registrationState).toBe('unregistration-pending');
  });

  it('retains a persisted intent after a retry failure', async () => {
    registrationState = 'unregistration-pending';
    mockUnregisterPush.mockResolvedValue({
      success: false,
      message: 'Request failed',
    });

    await expect(retryPendingBrazePushUnregistration()).resolves.toBe(false);

    expect(registrationState).toBe('unregistration-pending');
  });

  it('retries a persisted intent and clears it on success', async () => {
    registrationState = 'unregistration-pending';
    mockUnregisterPush.mockResolvedValue({ success: true });

    await expect(retryPendingBrazePushUnregistration()).resolves.toBe(true);

    expect(mockUnregisterPush).toHaveBeenCalledTimes(1);
    expect(registrationState).toBe('unregistered');
  });

  it('keeps the intent pending when the native module is missing', async () => {
    delete NativeModules.BrazePushModule;

    await expect(unregisterBrazePush()).resolves.toBe(false);

    expect(registrationState).toBe('unregistration-pending');
  });
});
