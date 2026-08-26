import { NativeModules } from 'react-native';
import {
  launchSumSubSdk,
  SUMSUB_NATIVE_MODULE_MISSING_ERROR,
  SUMSUB_NATIVE_MODULE_NAME,
} from './launchSumSubSdk';
import type { SumSubTokenExpirationHandler } from '@sumsub/react-native-mobilesdk-module';

const mockLaunch = jest.fn();
const mockBuild = jest.fn();
const mockWithHandlers = jest.fn();
const mockWithDebug = jest.fn();
const mockInit = jest.fn();
const mockReset = jest.fn();

jest.mock('@sumsub/react-native-mobilesdk-module', () => ({
  __esModule: true,
  default: {
    init: (...args: unknown[]) => mockInit(...args),
    reset: (...args: unknown[]) => mockReset(...args),
  },
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));

const originalSumSubNativeModule = NativeModules[SUMSUB_NATIVE_MODULE_NAME];

const restoreSumSubNativeModule = () => {
  if (originalSumSubNativeModule) {
    NativeModules[SUMSUB_NATIVE_MODULE_NAME] = originalSumSubNativeModule;
    return;
  }

  delete NativeModules[SUMSUB_NATIVE_MODULE_NAME];
};

const captureExpirationHandler = (): {
  handler?: SumSubTokenExpirationHandler;
} => {
  const captured: { handler?: SumSubTokenExpirationHandler } = {};
  mockInit.mockImplementation(
    (_token, handler: SumSubTokenExpirationHandler) => {
      captured.handler = handler;
      return { withDebug: mockWithDebug };
    },
  );
  return captured;
};

describe('launchSumSubSdk', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    restoreSumSubNativeModule();
    mockInit.mockReturnValue({ withDebug: mockWithDebug });
    mockWithDebug.mockReturnValue({ withHandlers: mockWithHandlers });
    mockWithHandlers.mockReturnValue({ build: mockBuild });
    mockBuild.mockReturnValue({ launch: mockLaunch });
    mockLaunch.mockResolvedValue({ success: true, status: 'Approved' });
  });

  afterEach(() => {
    restoreSumSubNativeModule();
    jest.resetAllMocks();
  });

  it('resets any previous SDK instance then launches with the given access token', async () => {
    const result = await launchSumSubSdk({ accessToken: 'applicant-token' });

    expect(mockReset).toHaveBeenCalledTimes(1);
    expect(mockInit).toHaveBeenCalledWith(
      'applicant-token',
      expect.any(Function),
    );
    expect(mockWithDebug).toHaveBeenCalledWith(expect.any(Boolean));
    expect(mockLaunch).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual({ success: true, status: 'Approved' });
  });

  it('launches with an empty access token when none is provided', async () => {
    await launchSumSubSdk({ accessToken: '' });

    expect(mockInit).toHaveBeenCalledWith('', expect.any(Function));
  });

  it('returns the original access token when the SDK asks to refresh and no handler is given', async () => {
    const captured = captureExpirationHandler();

    await launchSumSubSdk({ accessToken: 'applicant-token' });

    await expect(captured.handler?.()).resolves.toBe('applicant-token');
  });

  it('uses the caller token refresh handler when the SDK asks to refresh', async () => {
    const onTokenExpired = jest.fn().mockResolvedValue('refreshed-token');
    const captured = captureExpirationHandler();

    await launchSumSubSdk({
      accessToken: 'applicant-token',
      onTokenExpired,
    });

    await expect(captured.handler?.()).resolves.toBe('refreshed-token');
    expect(onTokenExpired).toHaveBeenCalledTimes(1);
  });

  it('propagates a launch rejection from the native SDK', async () => {
    mockLaunch.mockRejectedValueOnce(
      new Error('Aborted since another instance is in use!'),
    );

    await expect(
      launchSumSubSdk({ accessToken: 'applicant-token' }),
    ).rejects.toThrow('Aborted since another instance is in use!');
  });

  it('throws when the Sumsub native module is not linked', async () => {
    delete NativeModules[SUMSUB_NATIVE_MODULE_NAME];

    await expect(
      launchSumSubSdk({ accessToken: 'applicant-token' }),
    ).rejects.toThrow(SUMSUB_NATIVE_MODULE_MISSING_ERROR);

    expect(mockInit).not.toHaveBeenCalled();
  });
});
