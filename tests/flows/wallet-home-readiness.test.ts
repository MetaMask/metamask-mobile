import { LoginViewSelectors } from '../../app/components/Views/Login/LoginView.testIds';
import { WalletViewSelectorsIDs } from '../../app/components/Views/Wallet/WalletView.testIds';
import type { AppiumElement } from '../framework/AppiumElement';

jest.mock('../framework/Matchers', () => ({
  __esModule: true,
  default: {
    getElementByID: jest.fn(),
  },
}));

jest.mock('../framework/AppiumUtilities', () => ({
  withImplicitWait: jest.fn(
    (_timeout: number, operation: () => Promise<boolean>) => operation(),
  ),
}));

jest.mock('../framework/Utilities', () => ({
  sleep: jest.fn(() => Promise.resolve()),
}));

jest.mock('../framework/services/appium/sessionRecovery', () => ({
  isDeviceHealthError: jest.fn(() => false),
}));

jest.mock('../framework/PlatformLocator', () => ({
  PlatformDetector: {
    isAndroid: jest.fn(() => true),
    isIOS: jest.fn(() => false),
  },
}));

import Matchers from '../framework/Matchers';
import { isDeviceHealthError } from '../framework/services/appium/sessionRecovery';
import { isWalletHomeReadyOnAndroid } from './wallet-home-readiness';

const visibleByTestId = new Map<string, boolean>();

describe('isWalletHomeReadyOnAndroid', () => {
  beforeEach(() => {
    visibleByTestId.clear();
    jest.mocked(isDeviceHealthError).mockReturnValue(false);
    jest
      .mocked(Matchers.getElementByID)
      .mockImplementation(async (elementId) => {
        const testId = String(elementId);
        return {
          isVisible: async () => visibleByTestId.get(testId) ?? false,
          unwrap: () => ({
            isExisting: async () => false,
          }),
        } as unknown as AppiumElement;
      });
  });

  it('returns false while the login screen is displayed', async () => {
    visibleByTestId.set(LoginViewSelectors.CONTAINER, true);
    visibleByTestId.set(WalletViewSelectorsIDs.WALLET_CONTAINER, true);
    visibleByTestId.set(WalletViewSelectorsIDs.ACCOUNT_ICON, true);

    const ready = await isWalletHomeReadyOnAndroid();

    expect(ready).toBe(false);
  });

  it('returns true when the wallet container is displayed and login is hidden', async () => {
    visibleByTestId.set(LoginViewSelectors.CONTAINER, false);
    visibleByTestId.set(WalletViewSelectorsIDs.WALLET_CONTAINER, true);

    const ready = await isWalletHomeReadyOnAndroid();

    expect(ready).toBe(true);
  });

  it('returns true when login is hidden and a child indicator is displayed', async () => {
    visibleByTestId.set(LoginViewSelectors.CONTAINER, false);
    visibleByTestId.set(WalletViewSelectorsIDs.WALLET_CONTAINER, false);
    visibleByTestId.set(WalletViewSelectorsIDs.ACCOUNT_ICON, true);

    const ready = await isWalletHomeReadyOnAndroid();

    expect(ready).toBe(true);
  });

  it('returns false when login is hidden and no wallet chrome is displayed', async () => {
    visibleByTestId.set(LoginViewSelectors.CONTAINER, false);
    visibleByTestId.set(WalletViewSelectorsIDs.WALLET_CONTAINER, false);

    const ready = await isWalletHomeReadyOnAndroid();

    expect(ready).toBe(false);
  });
});
