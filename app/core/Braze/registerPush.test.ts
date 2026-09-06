import { NativeModules, Platform } from 'react-native';
import Logger from '../../util/Logger';
import { registerBrazePush } from './registerPush';

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

const mockClearPendingBrazePushUnregistration = jest.fn();
jest.mock('./pushRegistrationState', () => ({
  clearPendingBrazePushUnregistration: () =>
    mockClearPendingBrazePushUnregistration(),
  runLatestBrazePushOperation: ({
    operation,
  }: {
    operation: () => Promise<unknown>;
  }) => operation(),
}));

const mockRegisterPush = jest.fn();
const originalPlatform = Platform.OS;

describe('registerBrazePush', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    NativeModules.BrazePushModule = {
      registerPush: mockRegisterPush,
    };
    mockClearPendingBrazePushUnregistration.mockResolvedValue(undefined);
    mockRegisterPush.mockResolvedValue(undefined);
  });

  afterAll(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalPlatform,
    });
  });

  it('passes the FCM token to Android', async () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android',
    });

    await registerBrazePush('fcm-token');

    expect(mockRegisterPush).toHaveBeenCalledWith('fcm-token');
    expect(mockClearPendingBrazePushUnregistration).toHaveBeenCalledTimes(1);
    expect(Logger.log).toHaveBeenCalledWith(
      '[Braze] Registered this device for Braze push',
    );
  });

  it('does not pass the FCM token to iOS', async () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'ios',
    });

    await registerBrazePush('fcm-token');

    expect(mockRegisterPush).toHaveBeenCalledWith();
  });

  it('throws when the native module is missing', async () => {
    delete NativeModules.BrazePushModule;

    await expect(registerBrazePush('fcm-token')).rejects.toThrow(
      'BrazePushModule is not available',
    );

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      '[Braze] Native registerPush module is missing',
    );
  });

  it('throws when native registration fails', async () => {
    const nativeError = new Error('Request failed');
    mockRegisterPush.mockRejectedValue(nativeError);

    await expect(registerBrazePush('fcm-token')).rejects.toBe(nativeError);

    expect(Logger.error).toHaveBeenCalledWith(
      nativeError,
      '[Braze] Failed to register push',
    );
  });
});
