jest.mock('../../flows/wallet.flow', () => ({
  loginToAppPlaywright: jest.fn(),
  dismissPushNotificationExistingUserSheet: jest.fn(),
}));

jest.mock('../../flows/browser.flow', () => ({
  navigateToBrowserView: jest.fn(),
}));

jest.mock('./BrowserView', () => ({
  __esModule: true,
  default: {
    tapUrlInputBox: jest.fn(),
    navigateToURL: jest.fn(),
  },
}));

jest.mock('../MMConnect/DappConnectionModal', () => ({
  __esModule: true,
  default: {
    tapConnectButton: jest.fn(),
  },
}));

jest.mock('../../framework/ChromeCdpHelpers', () => ({
  __esModule: true,
  default: {
    clickByIdInWebView: jest.fn(),
    evaluateInWebView: jest.fn(),
    waitForElementEnabledByIdInWebView: jest.fn(),
    waitForElementTextInWebView: jest.fn(),
  },
}));

jest.mock('../../framework/Gestures', () => ({
  __esModule: true,
  default: {
    waitAndTap: jest.fn(),
  },
}));

jest.mock('../../framework/Matchers', () => ({
  __esModule: true,
  default: {
    getElementByID: jest.fn(),
  },
}));

jest.mock('../../framework/logger', () => ({
  createLogger: () => ({
    debug: jest.fn(),
    warn: jest.fn(),
  }),
}));

jest.mock('./MultichainTestDAppNetworkSelection', () => ({
  applyNetworkSelection: jest.fn(),
  clearSessionResult: jest.fn(),
  getMultichainTestDappBaseUrl: jest.fn(() => 'http://localhost:8093'),
  MULTICHAIN_DAPP_DEVICE_PORT: 8093,
  readAllCheckboxStates: jest.fn(() => ({})),
  readConnectionState: jest.fn(),
}));

import ChromeCdpHelpers from '../../framework/ChromeCdpHelpers';
import DappConnectionModal from '../MMConnect/DappConnectionModal';
import { MultichainTestDApp } from './MultichainTestDApp';
import {
  applyNetworkSelection,
  clearSessionResult,
  readConnectionState,
} from './MultichainTestDAppNetworkSelection';

const mockedClickById = jest.mocked(ChromeCdpHelpers.clickByIdInWebView);
const mockedWaitForText = jest.mocked(
  ChromeCdpHelpers.waitForElementTextInWebView,
);
const mockedEvaluate = jest.mocked(ChromeCdpHelpers.evaluateInWebView);
const mockedWaitForEnabled = jest.mocked(
  ChromeCdpHelpers.waitForElementEnabledByIdInWebView,
);
const mockedReadConnectionState = jest.mocked(readConnectionState);

describe('MultichainTestDApp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedClickById.mockResolvedValue(true);
    mockedEvaluate.mockResolvedValue(null);
    mockedReadConnectionState.mockResolvedValue('enabled');
  });

  it('does not restart auto-connect after the dapp handshake completed', async () => {
    const dapp = new MultichainTestDApp();

    await expect(dapp.useAutoConnectButton()).resolves.toBe(true);

    expect(mockedClickById).not.toHaveBeenCalled();
  });

  it('fails immediately when a session operation was not clicked', async () => {
    const dapp = new MultichainTestDApp();
    mockedClickById.mockResolvedValue(false);

    await expect(dapp.tapGetSessionButton()).rejects.toThrow(
      'could not get session',
    );
    expect(clearSessionResult).toHaveBeenCalled();
  });

  it('requires a create-session result for a requested network', async () => {
    const dapp = new MultichainTestDApp();
    mockedWaitForText.mockResolvedValue(null);
    jest
      .mocked(DappConnectionModal.tapConnectButton)
      .mockRejectedValue(new Error('No connection modal'));

    await expect(dapp.createSessionWithNetworks(['1'])).rejects.toThrow(
      'wallet_createSession produced no result',
    );

    expect(applyNetworkSelection).toHaveBeenCalledWith(['1']);
  });

  it('waits for custom invocation controls before interacting with them', async () => {
    const dapp = new MultichainTestDApp();
    mockedEvaluate.mockResolvedValue(true);

    await dapp.invokeMethod('1', 'wallet_getCallsStatus', ['0x123']);

    expect(mockedWaitForEnabled).toHaveBeenNthCalledWith(
      1,
      'http://localhost:8093',
      'method-select-eip155-1',
      30_000,
    );
    expect(mockedWaitForEnabled).toHaveBeenNthCalledWith(
      2,
      'http://localhost:8093',
      'invoke-method-request-eip155-1',
      30_000,
    );
    expect(mockedWaitForEnabled).toHaveBeenNthCalledWith(
      3,
      'http://localhost:8093',
      'invoke-method-eip155-1-btn',
      30_000,
    );
  });
});
