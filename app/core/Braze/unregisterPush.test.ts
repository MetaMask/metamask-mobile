import { NativeModules } from 'react-native';
import Logger from '../../util/Logger';
import { unregisterBrazePush } from './unregisterPush';

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

const mockUnregisterPush = jest.fn();

describe('unregisterBrazePush', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    NativeModules.BrazePushModule = {
      unregisterPush: mockUnregisterPush,
    };
  });

  it('resolves after the native module unregisters push', async () => {
    mockUnregisterPush.mockResolvedValue(undefined);

    await unregisterBrazePush();

    expect(mockUnregisterPush).toHaveBeenCalledTimes(1);
    expect(Logger.log).toHaveBeenCalledWith(
      '[Braze] Unregistered this device from Braze push',
    );
  });

  it('throws when the native module is missing', async () => {
    delete NativeModules.BrazePushModule;

    await expect(unregisterBrazePush()).rejects.toThrow(
      'BrazePushModule is not available',
    );

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      '[Braze] Native unregisterPush module is missing',
    );
  });

  it('throws when native unregistration fails', async () => {
    const nativeError = new Error('Request failed');
    mockUnregisterPush.mockRejectedValue(nativeError);

    await expect(unregisterBrazePush()).rejects.toBe(nativeError);

    expect(Logger.error).toHaveBeenCalledWith(
      nativeError,
      '[Braze] Failed to unregister push',
    );
  });
});
