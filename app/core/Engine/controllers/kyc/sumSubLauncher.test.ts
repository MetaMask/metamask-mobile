import { NativeModules } from 'react-native';
import {
  sumsubLauncher,
  SUMSUB_NATIVE_MODULE_MISSING_ERROR,
  SUMSUB_NATIVE_MODULE_NAME,
} from './sumSubLauncher';
import Logger from '../../../../util/Logger';

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

jest.mock('../../../../util/Logger', () => ({
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

describe('sumsubLauncher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    NativeModules[SUMSUB_NATIVE_MODULE_NAME] = { launch: jest.fn() };
    wireSumSubSdkBuilderMocks();
  });

  afterEach(() => {
    restoreSumSubNativeModule();
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('reports availability from the native module', () => {
    expect(sumsubLauncher.isAvailable()).toBe(true);

    delete NativeModules[SUMSUB_NATIVE_MODULE_NAME];

    expect(sumsubLauncher.isAvailable()).toBe(false);
  });

  it('launches with the given access token, locale, and debug flag', async () => {
    const result = await sumsubLauncher.launch({
      applicantAccessToken: 'applicant-token',
      onTokenExpiration: async () => 'applicant-token',
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

  it('uses the controller token refresh handler when the SDK asks to refresh', async () => {
    const onTokenExpiration = jest.fn().mockResolvedValue('refreshed-token');
    const captured = captureExpirationHandler();

    await sumsubLauncher.launch({
      applicantAccessToken: 'applicant-token',
      onTokenExpiration,
    });

    await expect(captured.handler?.()).resolves.toBe('refreshed-token');
    expect(onTokenExpiration).toHaveBeenCalledTimes(1);
  });

  it('propagates a launch rejection from the native SDK', async () => {
    mockLaunch.mockRejectedValueOnce(
      new Error('Aborted since another instance is in use!'),
    );

    await expect(
      sumsubLauncher.launch({
        applicantAccessToken: 'applicant-token',
        onTokenExpiration: async () => 'applicant-token',
      }),
    ).rejects.toThrow('Aborted since another instance is in use!');
  });

  it('throws when the Sumsub native module is not linked', async () => {
    delete NativeModules[SUMSUB_NATIVE_MODULE_NAME];

    await expect(
      sumsubLauncher.launch({
        applicantAccessToken: 'applicant-token',
        onTokenExpiration: async () => 'applicant-token',
      }),
    ).rejects.toThrow(SUMSUB_NATIVE_MODULE_MISSING_ERROR);

    expect(mockInit).not.toHaveBeenCalled();
  });

  it('forwards native SDK status changes to the controller', async () => {
    const onStatusChange = jest.fn();
    let onStatusChanged:
      | ((event: { prevStatus: string; newStatus: string }) => void)
      | undefined;
    mockWithHandlers.mockImplementation(
      (handlers: { onStatusChanged: typeof onStatusChanged }) => {
        onStatusChanged = handlers.onStatusChanged;
        return { withDebug: mockWithDebug };
      },
    );

    await sumsubLauncher.launch({
      applicantAccessToken: 'applicant-token',
      onTokenExpiration: async () => 'applicant-token',
      onStatusChange,
    });

    onStatusChanged?.({ prevStatus: 'Init', newStatus: 'Approved' });

    expect(onStatusChange).toHaveBeenCalledWith('Init', 'Approved');
    expect(jest.mocked(Logger.log)).toHaveBeenCalledWith(
      '[Sumsub] status changed',
      expect.objectContaining({
        previousStatus: 'Init',
        nextStatus: 'Approved',
      }),
    );
  });
});
