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
  __esModule: true,
  default: {
    executeWithRetry: jest.fn(async (operation: () => Promise<void>) => {
      let lastError: unknown;
      const originalDateNow = Date.now;
      let now = 0;
      Date.now = () => (now += 100);
      try {
        for (let attempt = 0; attempt < 10; attempt++) {
          try {
            return await operation();
          } catch (error) {
            lastError = error;
          }
        }
      } finally {
        Date.now = originalDateNow;
      }
      throw lastError;
    }),
  },
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
import {
  isLoginScreenDisplayed,
  isWalletHomeReadyOnAndroid,
  isWalletHomeReadyOnAndroidStable,
} from './wallet-home-readiness';

const visibleByTestId = new Map<string, boolean>();

const mockMatchersFromVisibilityMap = (): void => {
  jest.mocked(Matchers.getElementByID).mockImplementation(async (elementId) => {
    const testId = String(elementId);
    return {
      isVisible: async () => visibleByTestId.get(testId) ?? false,
      unwrap: () => ({
        isExisting: async () => false,
      }),
    } as unknown as AppiumElement;
  });
};

describe('wallet-home-readiness', () => {
  beforeEach(() => {
    visibleByTestId.clear();
    jest.mocked(isDeviceHealthError).mockReturnValue(false);
    mockMatchersFromVisibilityMap();
  });

  describe('isLoginScreenDisplayed', () => {
    it('returns true when a login child indicator is displayed', async () => {
      visibleByTestId.set(LoginViewSelectors.CONTAINER, false);
      visibleByTestId.set(LoginViewSelectors.PASSWORD_INPUT, true);

      await expect(isLoginScreenDisplayed()).resolves.toBe(true);
    });

    it('returns true when only the login container is displayed', async () => {
      visibleByTestId.set(LoginViewSelectors.CONTAINER, true);

      await expect(isLoginScreenDisplayed()).resolves.toBe(true);
    });

    it('returns false when no login chrome is displayed', async () => {
      await expect(isLoginScreenDisplayed()).resolves.toBe(false);
    });
  });

  describe('isWalletHomeReadyOnAndroid', () => {
    it('returns false while the login screen is displayed', async () => {
      visibleByTestId.set(LoginViewSelectors.CONTAINER, true);
      visibleByTestId.set(WalletViewSelectorsIDs.WALLET_CONTAINER, true);
      visibleByTestId.set(WalletViewSelectorsIDs.ACCOUNT_ICON, true);

      const ready = await isWalletHomeReadyOnAndroid();

      expect(ready).toBe(false);
    });

    it('returns false while a login child indicator is displayed', async () => {
      visibleByTestId.set(LoginViewSelectors.PASSWORD_INPUT, true);
      visibleByTestId.set(WalletViewSelectorsIDs.WALLET_CONTAINER, true);

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
});

describe('isWalletHomeReadyOnAndroidStable', () => {
  beforeEach(() => {
    visibleByTestId.clear();
    mockMatchersFromVisibilityMap();
  });

  it('returns true when wallet chrome remains ready through the stability window', async () => {
    visibleByTestId.set(LoginViewSelectors.CONTAINER, false);
    visibleByTestId.set(WalletViewSelectorsIDs.WALLET_CONTAINER, true);

    await expect(isWalletHomeReadyOnAndroidStable()).resolves.toBe(true);
  });

  it('returns false when wallet chrome is not ready', async () => {
    await expect(isWalletHomeReadyOnAndroidStable()).resolves.toBe(false);
  });
});
