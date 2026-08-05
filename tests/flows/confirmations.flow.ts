import Assertions from '../framework/Assertions';
import ChromeCdpHelpers from '../framework/ChromeCdpHelpers';
import { getDappUrl } from '../framework/fixtures/FixtureUtils';
import { PlatformDetector } from '../framework/PlatformLocator';
import { sleep } from '../framework/Utilities';
import WebView from '../framework/WebView';
import Browser from '../page-objects/Browser/BrowserView';
import FooterActions from '../page-objects/Browser/Confirmations/FooterActions';
import TestDApp from '../page-objects/Browser/TestDApp';
import TabBarComponent from '../page-objects/wallet/TabBarComponent';
import { navigateToBrowserView, waitForTestDappToLoad } from './browser.flow';
import { dismissPushNotificationExistingUserSheet } from './wallet.flow';

const DAPP_TAP_CONFIRM_ATTEMPTS = 3;
const CONFIRM_BUTTON_POLL_MS = 12_000;

const tapTestDappButton = async (
  pageUrl: string,
  buttonId: string,
  description: string,
): Promise<void> => {
  if (PlatformDetector.isAndroidAppium()) {
    const clicked = await ChromeCdpHelpers.clickByIdInWebView(
      pageUrl,
      buttonId,
    );
    if (!clicked) {
      await WebView.tapById(buttonId, {
        pageUrl,
        description: `${description} (native fallback after CDP miss)`,
      });
    }
  } else {
    await WebView.tapById(buttonId, {
      pageUrl,
      description,
    });
  }
};

/**
 * Opens the in-app browser, loads the test dapp with the given contract, and
 * taps a WebView button that should open a confirmation sheet.
 *
 * Android Appium prefers CDP trusted click (avoids UiAutomator taps that miss
 * the DOM handler). Falls back to native WebView tap only when CDP cannot
 * click — never both when CDP already succeeded (prevents double-submit).
 */
export const navigateToContractAndTap = async (
  contractAddress: string,
  buttonId: string,
  description: string,
): Promise<void> => {
  await navigateToBrowserView();
  await TestDApp.navigateToTestDappWithContract({
    contractAddress,
  });
  await waitForTestDappToLoad();

  const pageUrl = getDappUrl(0);
  let lastError: unknown;
  for (let attempt = 1; attempt <= DAPP_TAP_CONFIRM_ATTEMPTS; attempt++) {
    try {
      await tapTestDappButton(pageUrl, buttonId, description);
      await FooterActions.waitForConfirmButton(CONFIRM_BUTTON_POLL_MS);
      return;
    } catch (error) {
      lastError = error;
      if (attempt === DAPP_TAP_CONFIRM_ATTEMPTS) {
        break;
      }
      await sleep(1000);
    }
  }
  throw lastError;
};

/**
 * Confirms the open confirmation, dismisses post-confirm push opt-in if shown,
 * closes the browser, and asserts the Activity row for the submitted tx.
 */
export const confirmCloseAndAssertActivity = async (
  activityLabel: string,
): Promise<void> => {
  await FooterActions.tapConfirmButton();
  // Gate on confirm leaving the hierarchy — browser container can still
  // "exist" while the confirmation sheet is open.
  await FooterActions.waitForConfirmButtonGone();

  // Push opt-in ("Never miss a move") can appear after confirm and
  // block leaving the browser / reaching Activity.
  await dismissPushNotificationExistingUserSheet();

  await Assertions.expectElementToExist(Browser.browserScreenID, {
    description: 'Browser screen after confirm',
  });
  await Browser.tapCloseBrowserButton();
  await Assertions.expectElementToBeVisible(
    TabBarComponent.tabBarWalletButton,
    {
      description: 'Wallet tab visible after leaving browser',
    },
  );
  await TabBarComponent.tapActivity();
  await Assertions.expectTextDisplayed(activityLabel, {
    description: `Activity row "${activityLabel}"`,
  });
  await Assertions.expectTextDisplayed('Confirmed', {
    description: 'Activity status Confirmed',
  });
};
