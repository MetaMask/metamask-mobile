import Matchers from '../framework/Matchers';
import { withImplicitWait } from '../framework/AppiumUtilities';
import { PlatformDetector } from '../framework/PlatformLocator';
import { sleep } from '../framework/Utilities';
import { isDeviceHealthError } from '../framework/services/appium/sessionRecovery';
import { WalletViewSelectorsIDs } from '../../app/components/Views/Wallet/WalletView.testIds';
import { LoginViewSelectors } from '../../app/components/Views/Login/LoginView.testIds';

const READINESS_STABILITY_MS = 500;

interface AppiumElement {
  isVisible: () => Promise<boolean>;
  unwrap: () => { isExisting: () => Promise<boolean> };
}

/**
 * Child chrome that can report displayed while the parent `wallet-screen`
 * wrapper exists but returns `displayed === false` (Appium a11y flake).
 */
const WALLET_HOME_CHILD_INDICATOR_IDS = [
  WalletViewSelectorsIDs.WALLET_HEADER_ROOT,
  WalletViewSelectorsIDs.WALLET_HAMBURGER_MENU_BUTTON,
  WalletViewSelectorsIDs.ACCOUNT_ICON,
  WalletViewSelectorsIDs.WALLET_SCROLL_VIEW,
  WalletViewSelectorsIDs.ACTION_BUTTONS_CONTAINER,
] as const;

/** Fast Appium probe — avoids full assertion polling on every bootstrap loop. */
export const isTestIdDisplayed = async (testId: string): Promise<boolean> => {
  try {
    return await withImplicitWait(500, async () => {
      const el = (await Matchers.getElementByID(testId)) as AppiumElement;
      return await el.isVisible();
    });
  } catch (error) {
    // UiAutomator2 / shared-adb transport deaths cannot recover via polling —
    // surface immediately so waitForAppReady / login can fail fast and request
    // session recreate.
    if (isDeviceHealthError(error)) {
      throw error;
    }
    return false;
  }
};

export const isLoginScreenDisplayed = (): Promise<boolean> =>
  isTestIdDisplayed(LoginViewSelectors.CONTAINER);

export const isWalletContainerDisplayed = (): Promise<boolean> =>
  isTestIdDisplayed(WalletViewSelectorsIDs.WALLET_CONTAINER);

const isAnyWalletHomeChildIndicatorDisplayed = async (): Promise<boolean> => {
  for (const testId of WALLET_HOME_CHILD_INDICATOR_IDS) {
    if (await isTestIdDisplayed(testId)) {
      return true;
    }
  }
  return false;
};

/**
 * iOS only. `wallet-screen` may exist while `isDisplayed` is false.
 * Android must not use this: the wallet node can exist under the lock screen
 * before login is mounted (`waitForAppReady` in general.flow.ts).
 */
const isWalletScreenExistsWithLoginHiddenOnIOS = async (): Promise<boolean> => {
  try {
    return await withImplicitWait(500, async () => {
      const walletScreen = (await Matchers.getElementByID(
        WalletViewSelectorsIDs.WALLET_CONTAINER,
      )) as AppiumElement;
      if (!(await walletScreen.unwrap().isExisting())) {
        return false;
      }
      const loginContainer = (await Matchers.getElementByID(
        LoginViewSelectors.CONTAINER,
      )) as AppiumElement;
      return !(await loginContainer.isVisible());
    });
  } catch {
    return false;
  }
};

/**
 * Android Appium wallet readiness. Login must be hidden first — the wallet
 * node can exist under the lock screen. Then accept the parent container or a
 * displayed child. Do not treat mere hierarchy existence as ready.
 */
export const isWalletHomeReadyOnAndroid = async (): Promise<boolean> => {
  if (await isLoginScreenDisplayed()) {
    return false;
  }
  if (await isWalletContainerDisplayed()) {
    return true;
  }
  return isAnyWalletHomeChildIndicatorDisplayed();
};

export const isWalletHomeReadyOnAndroidStable = async (): Promise<boolean> => {
  if (!(await isWalletHomeReadyOnAndroid())) {
    return false;
  }
  await sleep(READINESS_STABILITY_MS);
  return isWalletHomeReadyOnAndroid();
};

/**
 * iOS Appium wallet readiness — `wallet-screen` may exist but report
 * `displayed === false` while child indicators are visible.
 */
export const isWalletHomeReadyOnIOS = async (): Promise<boolean> => {
  if (await isAnyWalletHomeChildIndicatorDisplayed()) {
    return true;
  }
  return isWalletScreenExistsWithLoginHiddenOnIOS();
};

export const isWalletHomeReadyOnAppium = async (): Promise<boolean> => {
  if (PlatformDetector.isIOS()) {
    return isWalletHomeReadyOnIOS();
  }
  if (PlatformDetector.isAndroid()) {
    return isWalletHomeReadyOnAndroid();
  }
  return false;
};
