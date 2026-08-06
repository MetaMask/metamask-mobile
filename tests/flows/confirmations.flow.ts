import Assertions from '../framework/Assertions';
import ChromeCdpHelpers from '../framework/ChromeCdpHelpers';
import { getDappUrl } from '../framework/fixtures/FixtureUtils';
import { PlatformDetector } from '../framework/PlatformLocator';
import WebView from '../framework/WebView';
import Browser from '../page-objects/Browser/BrowserView';
import ConnectBottomSheet from '../page-objects/Browser/ConnectBottomSheet';
import FooterActions from '../page-objects/Browser/Confirmations/FooterActions';
import TestDApp from '../page-objects/Browser/TestDApp';
import TabBarComponent from '../page-objects/wallet/TabBarComponent';
import { navigateToBrowserView, waitForTestDappToLoad } from './browser.flow';
import { dismissPushNotificationExistingUserSheet } from './wallet.flow';

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

  await TestDApp.tapDappConnectButton();
  await ConnectBottomSheet.tapConnectButton();

  const pageUrl = getDappUrl(0);
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

  await FooterActions.waitForConfirmButton();
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
