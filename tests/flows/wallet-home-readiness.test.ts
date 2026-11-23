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
  isWalletHomeReadyOnAndroid,
  isWalletHomeReadyOnIOSStable,
} from './wallet-home-readiness';

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

describe('isWalletHomeReadyOnIOSStable', () => {
  beforeEach(() => {
    visibleByTestId.clear();
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

  it('returns true only when wallet chrome remains visible after the stability window', async () => {
    visibleByTestId.set(WalletViewSelectorsIDs.ACCOUNT_ICON, true);

    await expect(isWalletHomeReadyOnIOSStable()).resolves.toBe(true);
  });

  it('returns false when wallet chrome disappears during the stability window', async () => {
    let accountIconProbeCount = 0;
    jest
      .mocked(Matchers.getElementByID)
      .mockImplementation(async (elementId) => {
        const testId = String(elementId);
        return {
          isVisible: async () =>
            testId === WalletViewSelectorsIDs.ACCOUNT_ICON &&
            accountIconProbeCount++ === 0,
          unwrap: () => ({
            isExisting: async () => false,
          }),
        } as unknown as AppiumElement;
      });

    await expect(isWalletHomeReadyOnIOSStable()).resolves.toBe(false);
  });

  it('accepts an existing wallet hierarchy when login is hidden', async () => {
    jest
      .mocked(Matchers.getElementByID)
      .mockImplementation(async (elementId) => {
        const testId = String(elementId);
        return {
          isVisible: async () => false,
          unwrap: () => ({
            isExisting: async () =>
              testId === WalletViewSelectorsIDs.WALLET_CONTAINER,
          }),
        } as unknown as AppiumElement;
      });

    await expect(isWalletHomeReadyOnIOSStable()).resolves.toBe(true);
  });

  it('returns false when wallet chrome is not visible', async () => {
    await expect(isWalletHomeReadyOnIOSStable()).resolves.toBe(false);
  });
});
