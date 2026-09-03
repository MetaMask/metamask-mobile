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

  it('returns success when the native module unregisters the token', async () => {
    mockUnregisterPush.mockResolvedValue({ success: true });

    const result = await unregisterBrazePush();

    expect(mockUnregisterPush).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true });
    expect(Logger.log).toHaveBeenCalledWith(
      '[Braze] Unregistered this device from Braze push',
    );
  });

  it('returns isRetriable false when Braze reports a non-retriable failure', async () => {
    mockUnregisterPush.mockResolvedValue({
      success: false,
      isRetriable: false,
      code: 'NO_PUSH_TOKEN',
      message: 'No push token is stored',
    });

    const result = await unregisterBrazePush();

    expect(result).toEqual({
      success: false,
      isRetriable: false,
      code: 'NO_PUSH_TOKEN',
      message: 'No push token is stored',
    });
  });

  it('returns isRetriable true when Braze reports a retriable failure', async () => {
    mockUnregisterPush.mockResolvedValue({
      success: false,
      isRetriable: true,
      code: 'REQUEST_FAILED',
      message: 'HTTP 429',
    });

    const result = await unregisterBrazePush();

    expect(result).toEqual({
      success: false,
      isRetriable: true,
      code: 'REQUEST_FAILED',
      message: 'HTTP 429',
    });
  });

  it('maps an unknown native failure code to UNKNOWN', async () => {
    mockUnregisterPush.mockResolvedValue({
      success: false,
      isRetriable: false,
      code: 'SOMETHING_NEW',
      message: 'new sdk error',
    });

    const result = await unregisterBrazePush();

    expect(result).toEqual({
      success: false,
      isRetriable: false,
      code: 'UNKNOWN',
      message: 'new sdk error',
    });
  });

  it('returns SDK_UNAVAILABLE when the native module is missing', async () => {
    delete NativeModules.BrazePushModule;

    const result = await unregisterBrazePush();

    expect(mockUnregisterPush).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      isRetriable: false,
      code: 'SDK_UNAVAILABLE',
      message: 'BrazePushModule is not available',
    });
  });

  it('returns UNKNOWN when the native module throws', async () => {
    mockUnregisterPush.mockRejectedValue(new Error('bridge exploded'));

    const result = await unregisterBrazePush();

    expect(result).toEqual({
      success: false,
      isRetriable: false,
      code: 'UNKNOWN',
      message: 'bridge exploded',
    });
  });
});
