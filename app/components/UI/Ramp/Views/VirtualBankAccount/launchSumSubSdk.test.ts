import { NativeModules } from 'react-native';
import {
  launchSumSubSdk,
  SUMSUB_NATIVE_MODULE_MISSING_ERROR,
  SUMSUB_NATIVE_MODULE_NAME,
} from './launchSumSubSdk';
import Logger from '../../../../../util/Logger';

const mockLaunch = jest.fn();
const mockBuild = jest.fn();
const mockWithLocale = jest.fn();
const mockWithDebug = jest.fn();
const mockWithHandlers = jest.fn();
const mockInit = jest.fn();

jest.mock('@sumsub/react-native-mobilesdk-module', () => ({
  __esModule: true,
  default: {
    init: (...args: unknown[]) => mockInit(...args),
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
  handler?: () => Promise<string>;
} => {
  const captured: { handler?: () => Promise<string> } = {};
  mockInit.mockImplementation((_token, handler: () => Promise<string>) => {
    captured.handler = handler;
    return { withHandlers: mockWithHandlers };
  });
  return captured;
};

const wireSumSubSdkBuilderMocks = () => {
  mockInit.mockReturnValue({ withHandlers: mockWithHandlers });
  mockWithHandlers.mockReturnValue({ withDebug: mockWithDebug });
  mockWithDebug.mockReturnValue({ withLocale: mockWithLocale });
  mockWithLocale.mockReturnValue({ build: mockBuild });
  mockBuild.mockReturnValue({ launch: mockLaunch });
  mockLaunch.mockResolvedValue({ success: true, status: 'Approved' });
};

describe('launchSumSubSdk', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    restoreSumSubNativeModule();
    wireSumSubSdkBuilderMocks();
  });

  afterEach(() => {
    restoreSumSubNativeModule();
    jest.resetAllMocks();
  });

  it('launches with the given access token, locale, and debug flag', async () => {
    const result = await launchSumSubSdk({
      accessToken: 'applicant-token',
      locale: 'pt',
      debug: true,
    });

    expect(mockInit).toHaveBeenCalledWith(
      'applicant-token',
      expect.any(Function),
    );
    expect(mockWithDebug).toHaveBeenCalledWith(true);
    expect(mockWithLocale).toHaveBeenCalledWith('pt');
    expect(mockLaunch).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual({ success: true, status: 'Approved' });
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

  it('propagates an init failure from the native SDK', async () => {
    mockInit.mockImplementation(() => {
      throw new Error('init failed');
    });

    await expect(
      launchSumSubSdk({ accessToken: 'applicant-token' }),
    ).rejects.toThrow('init failed');
  });

  it('throws when the Sumsub native module is not linked', async () => {
    delete NativeModules[SUMSUB_NATIVE_MODULE_NAME];

    await expect(
      launchSumSubSdk({ accessToken: 'applicant-token' }),
    ).rejects.toThrow(SUMSUB_NATIVE_MODULE_MISSING_ERROR);

    expect(mockInit).not.toHaveBeenCalled();
  });

  it('logs native SDK status changes', async () => {
    let onStatusChanged:
      | ((event: { prevStatus: string; newStatus: string }) => void)
      | undefined;
    mockWithHandlers.mockImplementation(
      (handlers: { onStatusChanged: typeof onStatusChanged }) => {
        onStatusChanged = handlers.onStatusChanged;
        return { withDebug: mockWithDebug };
      },
    );

    await launchSumSubSdk({ accessToken: 'applicant-token' });

    onStatusChanged?.({ prevStatus: 'Init', newStatus: 'Approved' });

    expect(jest.mocked(Logger.log)).toHaveBeenCalledWith(
      '[Sumsub] status changed',
      expect.objectContaining({
        previousStatus: 'Init',
        nextStatus: 'Approved',
      }),
    );
  });
});
