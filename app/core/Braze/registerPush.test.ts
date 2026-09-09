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

const mockGetBrazePushDesiredState = jest.fn();
const mockHasPendingBrazePushUnregistrationSync = jest.fn();
jest.mock('./pushRegistrationState', () => ({
  getBrazePushDesiredState: () => mockGetBrazePushDesiredState(),
  hasPendingBrazePushUnregistrationSync: () =>
    mockHasPendingBrazePushUnregistrationSync(),
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
    jest.resetAllMocks();
    NativeModules.BrazePushModule = {
      registerPush: mockRegisterPush,
    };
    mockGetBrazePushDesiredState.mockReturnValue('registered');
    mockHasPendingBrazePushUnregistrationSync.mockReturnValue(false);
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

  it('does not register while unregistration remains pending', async () => {
    mockHasPendingBrazePushUnregistrationSync.mockReturnValue(true);

    await registerBrazePush('fcm-token');

    expect(mockRegisterPush).not.toHaveBeenCalled();
  });

  it('does not register when unregistration is the latest desired state', async () => {
    mockGetBrazePushDesiredState.mockReturnValue('unregistered');

    await registerBrazePush('fcm-token');

    expect(mockRegisterPush).not.toHaveBeenCalled();
  });
});
