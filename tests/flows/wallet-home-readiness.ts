import PlaywrightMatchers from '../framework/PlaywrightMatchers';
import { withImplicitWait } from '../framework/PlaywrightUtilities';
import { WalletViewSelectorsIDs } from '../../app/components/Views/Wallet/WalletView.testIds';
import { LoginViewSelectors } from '../../app/components/Views/Login/LoginView.testIds';

const IOS_WALLET_HOME_INDICATOR_IDS = [
  WalletViewSelectorsIDs.WALLET_HEADER_ROOT,
  WalletViewSelectorsIDs.WALLET_HAMBURGER_MENU_BUTTON,
  WalletViewSelectorsIDs.ACCOUNT_ICON,
  WalletViewSelectorsIDs.WALLET_SCROLL_VIEW,
  WalletViewSelectorsIDs.ACTION_BUTTONS_CONTAINER,
] as const;

const isElementDisplayedById = async (testId: string): Promise<boolean> => {
  try {
    return await withImplicitWait(500, async () => {
      const el = await PlaywrightMatchers.getElementById(testId, {
        exact: true,
      });
      return await el.isVisible();
    });
  } catch {
    return false;
  }
};

const isAnyWalletHomeIndicatorDisplayedOnIOS = async (): Promise<boolean> => {
  for (const testId of IOS_WALLET_HOME_INDICATOR_IDS) {
    if (await isElementDisplayedById(testId)) {
      return true;
    }
  }
  return false;
};

const isWalletScreenExistsWithLoginHiddenOnIOS = async (): Promise<boolean> => {
  try {
    return await withImplicitWait(500, async () => {
      const walletScreen = await PlaywrightMatchers.getElementById(
        WalletViewSelectorsIDs.WALLET_CONTAINER,
        { exact: true },
      );
      if (!(await walletScreen.unwrap().isExisting())) {
        return false;
      }
      const loginContainer = await PlaywrightMatchers.getElementById(
        LoginViewSelectors.CONTAINER,
        { exact: true },
      );
      return !(await loginContainer.isVisible());
    });
  } catch {
    return false;
  }
};

/**
 * iOS Appium wallet readiness — `wallet-screen` may exist but report
 * `displayed === false` while child indicators are visible.
 */
export const isWalletHomeReadyOnIOS = async (): Promise<boolean> => {
  if (await isAnyWalletHomeIndicatorDisplayedOnIOS()) {
    return true;
  }
  return isWalletScreenExistsWithLoginHiddenOnIOS();
};
