import { navigateToBrowserView } from './browser.flow';
import { Assertions } from '../framework';
import BrowserView from '../page-objects/Browser/BrowserView';
import TabBarComponent from '../page-objects/wallet/TabBarComponent';
import WalletView from '../page-objects/wallet/WalletView';
import AccountMenu from '../page-objects/AccountMenu/AccountMenu';
import SettingsView from '../page-objects/Settings/SettingsView';
import SnapSettingsView from '../page-objects/Settings/SnapSettingsView';
import TestSnaps from '../page-objects/Browser/TestSnaps';

/**
 * Navigate from the browser to Snap Settings.
 * With disableSynchronization the tab bar may not be immediately available
 * after closing the browser, so we navigate step-by-step with explicit waits.
 */
export async function navigateFromBrowserToSnapSettings(): Promise<void> {
  await BrowserView.tapCloseBrowserButton();
  await TabBarComponent.tapWallet();
  await WalletView.tapHamburgerMenu();
  await Assertions.expectElementToBeVisible(AccountMenu.container, {
    timeout: 10_000,
    description: 'Account menu should be visible',
  });
  await AccountMenu.tapSettings();
  await Assertions.expectElementToBeVisible(SettingsView.title, {
    timeout: 10_000,
    description: 'Settings view title should be visible',
  });
  await SettingsView.tapSnaps();
}

/**
 * Leave snap detail → snaps list → settings → account menu → wallet.
 * Asserts each screen is ready before the next back tap so a silent miss
 * cannot skip ahead while the stack is still animating.
 */
export async function navigateBackFromSnapSettingsToWallet(): Promise<void> {
  await SnapSettingsView.tapBackButton();
  await Assertions.expectElementToBeVisible(SnapSettingsView.listBackButton, {
    timeout: 10_000,
    description: 'Snaps list back button should be visible',
  });

  await SnapSettingsView.tapListBackButton();
  await Assertions.expectElementToBeVisible(SettingsView.title, {
    timeout: 10_000,
    description: 'Settings view should be visible after leaving snaps list',
  });

  await SettingsView.tapBackButton();
  await Assertions.expectElementToBeVisible(AccountMenu.container, {
    timeout: 10_000,
    description: 'Account menu should be visible after leaving settings',
  });

  await AccountMenu.tapBack();
}

export async function connectDialogSnap(): Promise<void> {
  await navigateToBrowserView();
  await TestSnaps.navigateToTestSnap();
  await TestSnaps.installSnap('connectDialogSnapButton');
}
