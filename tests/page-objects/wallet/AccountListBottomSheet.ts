import { CellComponentSelectorsIDs } from '../../../app/component-library/components/Cells/Cell/CellComponent.testIds';
import {
  AccountListBottomSheetSelectorsIDs,
  AccountListBottomSheetSelectorsText,
} from '../../../app/components/Views/AccountSelector/AccountListBottomSheet.testIds';
import { CommonSelectorsIDs } from '../../../app/util/Common.testIds';
import { WalletViewSelectorsIDs } from '../../../app/components/Views/Wallet/WalletView.testIds';
import { ConnectAccountBottomSheetSelectorsIDs } from '../../../app/components/Views/MultichainAccounts/shared/ConnectAccountBottomSheet.testIds';
import { AccountCellIds } from '../../../app/component-library/components-temp/MultichainAccounts/AccountCell/AccountCell.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Assertions from '../../framework/Assertions';
import UnifiedGestures from '../../framework/UnifiedGestures';
import {
  asPlaywrightElement,
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import type { PlaywrightElement } from '../../framework/PlaywrightAdapter';
import { FrameworkDetector } from '../../framework/FrameworkDetector';
import { PlatformDetector } from '../../framework/PlatformLocator';
import {
  createLogger,
  encapsulatedAction,
  LogLevel,
  PlaywrightGestures,
  sleep,
  Utilities,
} from '../../framework';
import AddAccountBottomSheet from './AddAccountBottomSheet';

const ADD_ACCOUNT_SHEET_TIMEOUT_MS = 30_000;

const logger = createLogger({
  name: 'AccountListBottomSheet',
  level: LogLevel.DEBUG,
});

class AccountListBottomSheet {
  /**
   * Account list container.
   * Detox: `account-list` testID.
   * Appium iOS: header title text — `account-list` is on a wrapper XCTest keeps
   * `visible=false` while the sheet is open; "Accounts" is reliably displayed.
   * Appium Android: `account-list` testID.
   */
  get accountList(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID,
        ),
      appium: () =>
        PlatformDetector.isIOS()
          ? PlaywrightMatchers.getElementByText(
              AccountListBottomSheetSelectorsText.ACCOUNTS_LIST_TITLE,
            )
          : PlaywrightMatchers.getElementById(
              AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID,
              { exact: true },
            ),
    });
  }

  get accountTypeLabel(): EncapsulatedElementType {
    return Matchers.getElementByID(
      AccountListBottomSheetSelectorsIDs.ACCOUNT_TYPE_LABEL,
    );
  }

  get accountTagLabel(): EncapsulatedElementType {
    return Matchers.getElementByID(CellComponentSelectorsIDs.TAG_LABEL);
  }

  get title(): EncapsulatedElementType {
    return Matchers.getElementByText(
      AccountListBottomSheetSelectorsText.ACCOUNTS_LIST_TITLE,
    );
  }

  /** Header back control (same testID as CommonView.backButton / AccountSelector HeaderCompactStandard). */
  get backButton(): EncapsulatedElementType {
    return Matchers.getElementByID(CommonSelectorsIDs.BACK_ARROW_BUTTON);
  }

  /** Add wallet/account button - wdio tapOnAddWalletButton uses 'account-list-add-account-button' */
  get addAccountButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
    );
  }

  get addWalletButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
    );
  }

  get addEthereumAccountButton(): EncapsulatedElementType {
    return Matchers.getElementByText(
      AccountListBottomSheetSelectorsText.ADD_ETHEREUM_ACCOUNT,
    );
  }

  get removeAccountAlertText(): EncapsulatedElementType {
    return Matchers.getElementByText(
      AccountListBottomSheetSelectorsText.REMOVE_IMPORTED_ACCOUNT,
    );
  }

  get connectAccountsButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON,
    );
  }

  createAccountLink(index: number): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          AccountListBottomSheetSelectorsIDs.CREATE_ACCOUNT,
          index,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          AccountListBottomSheetSelectorsIDs.CREATE_ACCOUNT,
          { exact: true, index },
        ),
    });
  }

  async getAccountElementByAccountName(
    accountName: string,
  ): Promise<DetoxElement> {
    return Matchers.getElementByIDAndLabel(
      CellComponentSelectorsIDs.BASE_TITLE,
      accountName,
    );
  }

  getAccountElementByAccountNameV2(
    accountName: string,
  ): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByIDAndLabel(AccountCellIds.ADDRESS, accountName),
      appium: () => PlaywrightMatchers.getElementByText(accountName),
    });
  }

  /**
   * Appium-only: return every element matching the given account name.
   * Use when the count of matches is meaningful (e.g. the same name appears
   * under multiple SRPs). The singular variant only resolves to one element,
   * so a visibility check there can mask a missing duplicate.
   *
   * Detox has no native "return all matches" primitive — index into the
   * matcher with `.atIndex(N).toExist()` per expected cell instead.
   */
  async getAccountElementsByAccountNameV2(
    accountName: string,
  ): Promise<PlaywrightElement[]> {
    if (!FrameworkDetector.isAppium()) {
      throw new Error(
        'getAccountElementsByAccountNameV2 is Appium-only. On Detox, assert each cell with `getAccountElementByAccountNameV2(name)` indexed via .atIndex(N).',
      );
    }
    if (PlatformDetector.isAndroid()) {
      const escapedAccountName = accountName.replace(/'/g, "\\'");
      // Anchor on the name text, then step up to the tappable row — immune to
      // the RN view flattening that detaches the row from its CONTAINER.
      return Matchers.getAllElementsByXPath(
        `//*[@resource-id='${AccountCellIds.ADDRESS}' and @text='${escapedAccountName}']/ancestor::*[@resource-id='${AccountCellIds.SELECT}'][1]`,
      );
    }

    // iOS collapses the row's children, so match the row itself: name is the
    // testID, label aggregates to the account name.
    return Matchers.getAllElementsByXPath(
      `//*[@name='${AccountCellIds.SELECT}' and @label='${accountName}']`,
    );
  }

  getSelectElement(index: number): EncapsulatedElementType {
    return Matchers.getElementByID(CellComponentSelectorsIDs.SELECT, index);
  }

  getMultiselectElement(index: number): EncapsulatedElementType {
    return Matchers.getElementByID(
      CellComponentSelectorsIDs.MULTISELECT,
      index,
    );
  }

  /**
   * Retrieves the title/name of an element using the `cellbase-avatar-title` ID.
   * Note: The `select-with-menu` ID element seems to never receive the tap event,
   * so this method fetches the title/name instead.
   *
   * @param {number} index - The index of the element to retrieve.
   * @returns {Detox.IndexableNativeElement} The matcher for the element's title/name.
   */
  getSelectWithMenuElementName(index: number): EncapsulatedElementType {
    return Matchers.getElementByID(CellComponentSelectorsIDs.BASE_TITLE, index);
  }

  async tapEditAccountActionsAtIndex(index: number): Promise<void> {
    await Gestures.tapAtIndex(
      Matchers.getElementByID(WalletViewSelectorsIDs.ACCOUNT_ACTIONS),
      index,
    );
  }

  accountNameInList(accountName: string): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText(accountName, 1),
      appium: () => PlaywrightMatchers.getElementByCatchAll(accountName),
    });
  }

  async tapAccountIndex(index: number): Promise<void> {
    await Gestures.waitAndTap(this.getMultiselectElement(index), {
      elemDescription: `Account at index ${index}`,
    });
  }

  async tapToSelectActiveAccountAtIndex(index: number): Promise<void> {
    await Gestures.waitAndTap(this.getSelectWithMenuElementName(index), {
      elemDescription: `Account at index ${index}`,
    });
  }

  async longPressAccountAtIndex(index: number): Promise<void> {
    await Gestures.longPress(this.getSelectWithMenuElementName(index), {
      elemDescription: 'Account name',
    });
  }

  async tapAddAccountButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.addAccountButton, {
      description: 'Add Account button',
      timeout: 20_000,
      checkForDisplayed: true,
      checkForEnabled: true,
      waitForInteractive: true,
      enabledStableReads: 3,
      postEnabledSettleMs: 250,
    });
  }

  async tapAddWalletButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.addWalletButton, {
      description: 'Add Wallet button',
      timeout: 20_000,
      checkForDisplayed: true,
      checkForEnabled: true,
      waitForInteractive: true,
      enabledStableReads: 3,
      postEnabledSettleMs: 250,
    });
  }

  async openAddAccountSheet(): Promise<void> {
    if (FrameworkDetector.isAppium()) {
      await this.waitForAccountSyncToComplete();
    }

    await this.tapAddAccountButton();
    await AddAccountBottomSheet.waitForImportSrpOption({
      timeout: ADD_ACCOUNT_SHEET_TIMEOUT_MS,
    });
  }

  async openAddWalletSheet(): Promise<void> {
    if (FrameworkDetector.isAppium()) {
      await this.waitForAccountSyncToComplete();
    }

    await this.tapAddWalletButton();
    await AddAccountBottomSheet.waitForImportAccountOption({
      timeout: ADD_ACCOUNT_SHEET_TIMEOUT_MS,
    });
  }

  async tapBackButton(): Promise<void> {
    await Gestures.waitAndTap(this.backButton, {
      elemDescription: 'Account list header back button',
    });
  }

  /**
   * Appium: poll until the account list sheet is open.
   * Retries lookup + visibility — needed after rename/back navigation when the
   * sheet is animating in and text/testID queries can briefly miss.
   */
  async waitForAccountListVisible(timeout = 15_000): Promise<void> {
    if (!FrameworkDetector.isAppium()) {
      await Assertions.expectElementToBeVisible(this.accountList, { timeout });
      return;
    }

    await Utilities.executeWithRetry(
      async () => {
        let el: PlaywrightElement;
        try {
          el = PlatformDetector.isIOS()
            ? await PlaywrightMatchers.getElementByText(
                AccountListBottomSheetSelectorsText.ACCOUNTS_LIST_TITLE,
              )
            : await PlaywrightMatchers.getElementById(
                AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID,
                { exact: true },
              );
        } catch {
          throw new Error('Account list sheet element not found');
        }

        const visible = await el.isVisible().catch(() => false);
        if (!visible) {
          throw new Error('Account list sheet is not visible yet');
        }
      },
      {
        timeout,
        interval: 500,
        description: 'Account list sheet visible',
      },
    );
  }

  async tapAddAccountButtonV2(options?: {
    srpIndex?: number;
    shouldWait?: boolean;
  }): Promise<void> {
    const button = Matchers.getElementByID(
      AccountListBottomSheetSelectorsIDs.CREATE_ACCOUNT,
      options?.srpIndex ?? 0,
    );

    await encapsulatedAction({
      detox: async () => {
        await Assertions.expectElementToHaveText(button, 'Add account', {
          description: 'Add Account button should be ready (not syncing)',
          timeout: 30000,
        });

        await Gestures.waitAndTap(button, {
          elemDescription: 'Add Account button in V2 multichain accounts',
          delay: options?.shouldWait ? 5000 : 0,
        });
      },
      appium: async () => {
        const buttonIndex = options?.srpIndex ?? 0;

        // Account sync/discovery can keep the row visible but not yet tappable.
        // Wait for the sync phase to settle before tapping "Add account".
        await this.waitForAccountSyncToComplete(90_000, {
          addAccountButtonIndex: buttonIndex,
        });

        // Re-query after sync settle — never reuse a pre-sync element handle.
        const tapTarget = await this.getAddAccountButtonTapTarget(buttonIndex);

        await PlaywrightGestures.waitAndTap(tapTarget, {
          delay: options?.shouldWait ? 5000 : 0,
          timeout: 20_000,
          checkForDisplayed: true,
          checkForEnabled: true,
          waitForInteractive: false,
          postEnabledSettleMs: 500,
        });
      },
    });
  }

  async tapAddEthereumAccountButton(): Promise<void> {
    await Gestures.waitAndTap(this.addEthereumAccountButton, {
      elemDescription: 'Add Ethereum Account button',
    });
  }

  async tapCreateAccount(index: number): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        const link = this.createAccountLink(index);
        await Gestures.waitAndTap(link, {
          elemDescription: 'Create account link',
        });
      },
      appium: async () => {
        const link = await asPlaywrightElement(this.createAccountLink(index));
        await PlaywrightGestures.scrollIntoView(link, {
          scrollParams: { direction: 'down' },
        });
        await PlaywrightGestures.waitAndTap(link);
        await this.waitForAccountSyncToComplete(90_000, {
          addAccountButtonIndex: index,
        });
      },
    });
  }

  async longPressImportedAccount(): Promise<void> {
    await Gestures.longPress(this.getSelectElement(1), {
      elemDescription: 'Imported account',
    });
  }

  async swipeToDismissAccountsModal(): Promise<void> {
    await Gestures.swipe(this.title, 'down', {
      speed: 'fast',
      percentage: 0.6,
    });
  }

  async tapYesToRemoveImportedAccountAlertButton(): Promise<void> {
    await Gestures.waitAndTap(this.removeAccountAlertText, {
      elemDescription: 'Yes to remove imported account alert button',
    });
  }

  async tapConnectAccountsButton(): Promise<void> {
    await Gestures.waitAndTap(this.connectAccountsButton, {
      elemDescription: 'Connect accounts button',
    });
  }

  async tapAccountByName(accountName: string): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        const name = Matchers.getElementByText(accountName);
        await Gestures.waitAndTap(name);
      },
      appium: async () => {
        const name = await PlaywrightMatchers.getElementByText(accountName);
        await PlaywrightGestures.scrollIntoView(name);
        await PlaywrightGestures.waitAndTap(name);
      },
    });
  }

  async tapAccountByNameV2(
    accountName: string,
    exactMatch: boolean = false,
  ): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        const accountEl = this.getAccountElementByAccountNameV2(accountName);
        await Gestures.waitAndTap(accountEl, {
          elemDescription: `Tap on account with name: ${accountName}`,
        });
      },
      appium: async () => {
        if (PlatformDetector.isAndroid()) {
          await Utilities.executeWithRetry(
            async () => {
              const cells =
                await this.getAccountElementsByAccountNameV2(accountName);
              if (cells.length === 0) {
                throw new Error(`No account row found for "${accountName}"`);
              }

              const cell = cells[cells.length - 1];
              for (const direction of ['up', 'down'] as const) {
                try {
                  await PlaywrightGestures.scrollIntoView(cell, {
                    scrollParams: { direction },
                    maxScrolls: 10,
                  });
                  if (await cell.isVisible()) {
                    await PlaywrightGestures.waitAndTap(cell);
                    return;
                  }
                } catch {
                  // try the other scroll direction
                }
              }

              throw new Error(
                `Account "${accountName}" is not visible or tappable in the account list`,
              );
            },
            {
              description: `Tap account with name: ${accountName}`,
              timeout: 20_000,
              interval: 500,
            },
          );
          return;
        }

        const accountEl = await PlaywrightMatchers.getElementByText(
          accountName,
          exactMatch,
        );
        await PlaywrightGestures.scrollIntoView(accountEl);
        await PlaywrightGestures.waitAndTap(accountEl);
      },
    });
  }

  async scrollToAccount(index: number): Promise<void> {
    await Gestures.scrollToElement(
      Matchers.getElementByID(WalletViewSelectorsIDs.ACCOUNT_ACTIONS, index),
      Matchers.getIdentifier(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID,
      ),
    );
  }

  async scrollToBottomOfAccountList(): Promise<void> {
    await UnifiedGestures.swipe(this.accountList, 'up', {
      speed: 'fast',
      description: 'Scroll to bottom of account list',
    });
  }

  // V2 Multichain Accounts Methods
  get ellipsisMenuButton(): EncapsulatedElementType {
    return Matchers.getElementByID(AccountCellIds.MENU);
  }

  /**
   * Get the ellipsis menu button for a specific account by index
   * @param accountIndex - The index of the account (0-based)
   * @returns The ellipsis menu element at the specified index
   */
  async getEllipsisMenuButtonAtIndex(
    accountIndex: number,
  ): Promise<Detox.IndexableNativeElement> {
    const el = (await this.ellipsisMenuButton) as Detox.IndexableNativeElement;
    return el.atIndex(accountIndex) as Detox.IndexableNativeElement;
  }

  /**
   * Tap the ellipsis menu button for a specific account in V2 multichain accounts
   * @param accountIndex - The index of the account to tap (0-based)
   */
  async tapAccountEllipsisButtonV2(
    accountIndex: number,
    { shouldWait = false }: { shouldWait: boolean } = { shouldWait: false },
  ): Promise<void> {
    const elem = Matchers.getElementByID(AccountCellIds.MENU, accountIndex);
    await Gestures.waitAndTap(elem, {
      elemDescription: `V2 ellipsis menu button for account at index ${accountIndex}`,
      delay: shouldWait ? 1500 : 0,
    });
  }

  /**
   * Tap the ellipsis menu for the account row matching `accountName` (Appium).
   * Prefer this over index when the list mixes HD and snap accounts.
   */
  async tapAccountEllipsisForAccountNameV2(accountName: string): Promise<void> {
    if (!FrameworkDetector.isAppium()) {
      throw new Error(
        'tapAccountEllipsisForAccountNameV2 is Appium-only. On Detox, use tapAccountEllipsisButtonV2 with a known index.',
      );
    }

    const accountCells =
      await this.getAccountElementsByAccountNameV2(accountName);
    if (accountCells.length === 0) {
      throw new Error(`No account row found for "${accountName}"`);
    }

    await PlaywrightGestures.scrollIntoView(
      accountCells[accountCells.length - 1],
    );

    const addressXpath = PlatformDetector.isAndroid()
      ? `//*[@resource-id='${AccountCellIds.ADDRESS}']`
      : `//*[@name='${AccountCellIds.ADDRESS}']`;
    const addressElements = await Matchers.getAllElementsByXPath(addressXpath);

    let menuIndex = -1;
    for (let i = 0; i < addressElements.length; i++) {
      const text = (await addressElements[i].textContent()).trim();
      if (text === accountName) {
        menuIndex = i;
      }
    }

    if (menuIndex < 0) {
      throw new Error(
        `Could not resolve ellipsis menu index for account "${accountName}"`,
      );
    }

    await this.tapAccountEllipsisButtonV2(menuIndex);
  }

  async expectAccountVisibleByNameV2(
    accountName: string,
    options: { description?: string; timeout?: number } = {},
  ): Promise<void> {
    const timeout = options.timeout ?? 15_000;
    const description =
      options.description ?? `${accountName} should be visible in account list`;

    if (!FrameworkDetector.isAppium()) {
      await Assertions.expectElementToBeVisible(
        this.getAccountElementByAccountNameV2(accountName),
        { description, timeout },
      );
      return;
    }

    await Utilities.executeWithRetry(
      async () => {
        const cells = await this.getAccountElementsByAccountNameV2(accountName);
        if (cells.length === 0) {
          return false;
        }

        const cell = cells[0];
        for (const direction of ['up', 'down'] as const) {
          try {
            await PlaywrightGestures.scrollIntoView(cell, {
              scrollParams: { direction },
              maxScrolls: 10,
            });
            if (await cell.isVisible()) {
              return true;
            }
          } catch {
            // try the other scroll direction
          }
        }

        return await cell.isVisible();
      },
      {
        description,
        timeout,
        interval: 500,
      },
    );
  }

  /**
   * Dismiss the account list modal in V2 multichain accounts
   * Note: EditAccountName screen auto-dismisses after save in V2, so no manual close needed
   * V2 has multiple modal layers - need to swipe twice to fully dismiss
   */
  async dismissAccountListModalV2(): Promise<void> {
    // First swipe to dismiss the MultichainAccountActions modal
    await this.swipeToDismissAccountsModal();

    // Second swipe to dismiss the AccountListBottomSheet
    await this.swipeToDismissAccountsModal();
  }

  private static readonly ADD_ACCOUNT_READY_LABEL = 'Add account';

  /**
   * Appium: fresh lookup of the V2 footer label (`CREATE_ACCOUNT` testID).
   */
  private async getAddAccountButtonLabel(
    srpIndex: number,
  ): Promise<PlaywrightElement> {
    return PlaywrightMatchers.getElementById(
      AccountListBottomSheetSelectorsIDs.CREATE_ACCOUNT,
      { exact: true, index: srpIndex },
    );
  }

  /**
   * Appium: true while the footer label is not yet showing the idle copy.
   * Catches fast sync/discovery flashes that Step 1 can miss via global text search.
   */
  private async isAddAccountFooterBusy(srpIndex: number): Promise<boolean> {
    try {
      const label = await this.getAddAccountButtonLabel(srpIndex);
      const text = (await label.textContent()).trim();
      return text !== AccountListBottomSheet.ADD_ACCOUNT_READY_LABEL;
    } catch {
      return false;
    }
  }

  /**
   * Appium: resolve the tappable row for "Add account" (V2 multichain footer).
   * `CREATE_ACCOUNT` is on the label `Text`; the disabled state lives on the parent
   * `TouchableOpacity`, so taps must target the clickable ancestor on Android.
   */
  private async getAddAccountButtonTapTarget(
    srpIndex: number,
  ): Promise<PlaywrightElement> {
    const createAccountId = AccountListBottomSheetSelectorsIDs.CREATE_ACCOUNT;

    if (PlatformDetector.isAndroid()) {
      return PlaywrightMatchers.getElementByXPath(
        `(//*[@resource-id='${createAccountId}'])[${srpIndex + 1}]/ancestor::*[@clickable='true'][1]`,
      );
    }

    return PlaywrightMatchers.getElementById(createAccountId, {
      exact: true,
      index: srpIndex,
    });
  }

  /**
   * Appium: poll with fresh DOM queries until the footer label reads "Add account"
   * and the clickable row is stably interactive.
   */
  private async waitForAddAccountButtonReady(
    srpIndex: number,
    timeoutMs: number,
  ): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        const label = await this.getAddAccountButtonLabel(srpIndex);
        const text = (await label.textContent()).trim();
        if (text !== AccountListBottomSheet.ADD_ACCOUNT_READY_LABEL) {
          throw new Error(
            `Add account footer label is "${text}", expected "${AccountListBottomSheet.ADD_ACCOUNT_READY_LABEL}"`,
          );
        }

        const tapTarget = await this.getAddAccountButtonTapTarget(srpIndex);
        await PlaywrightGestures.waitUntilInteractive(tapTarget, 3000, {
          requiredStableReads: 3,
        });
      },
      {
        timeout: timeoutMs,
        interval: 500,
        description: `Add account button (index ${srpIndex}) ready`,
      },
    );
  }

  /**
   * Waits for the account sync to complete.
   * @param timeout - The timeout in milliseconds.
   * @param options.addAccountButtonIndex - When set (Appium V2 add-account flows), also wait until that footer row is interactive after sync/discovery text clears.
   * @returns {Promise<void>} Resolves when the account sync is complete.
   */
  async waitForAccountSyncToComplete(
    timeout = 90000,
    options?: { addAccountButtonIndex?: number },
  ): Promise<void> {
    logger.debug('⏳ waitForSyncingToComplete: Starting...');
    const startTime = Date.now();
    const pollInterval = 500;
    const initialWaitTimeout = 5000; // 5 seconds to wait for syncing/discovering to appear

    const getElapsed = () => ((Date.now() - startTime) / 1000).toFixed(1);

    /** Safely check if a text element is visible — returns false if not found. */
    const isTextVisible = async (text: string): Promise<boolean> => {
      try {
        const el = await PlaywrightMatchers.getElementByCatchAll(text);
        return await el.isVisible();
      } catch {
        return false;
      }
    };

    // Step 1: Wait up to 5 seconds for "Syncing" or "Discovering" to appear
    logger.debug(
      '⏳ Step 1: Waiting up to 5s for "Syncing" or "Discovering" to appear...',
    );
    let syncingDetected = false;
    const footerIndex = options?.addAccountButtonIndex;
    while (Date.now() - startTime < initialWaitTimeout) {
      const isSyncing = await isTextVisible('Syncing');
      const isDiscovering = await isTextVisible('Discovering');
      const footerBusy =
        footerIndex !== undefined &&
        (await this.isAddAccountFooterBusy(footerIndex));

      if (isSyncing || isDiscovering || footerBusy) {
        syncingDetected = true;
        logger.debug(
          `✅ Step 1: Loading detected after ${getElapsed()}s (Syncing: ${isSyncing}, Discovering: ${isDiscovering}, footerBusy: ${footerBusy})`,
        );
        break;
      }
      await sleep(pollInterval);
    }

    if (!syncingDetected) {
      logger.debug(
        `⏳ Step 1: No syncing/discovering/footer-busy within 5s — skipping text-settle steps`,
      );
    } else if (footerIndex !== undefined) {
      // Step 2–4 (footer path): re-query label until idle copy shows, even when
      // global "Syncing"/"Discovering" text was never visible or flashed quickly.
      logger.debug(
        `⏳ Step 2: Waiting for Add account footer label (index ${footerIndex})...`,
      );
      while (Date.now() - startTime < timeout) {
        if (!(await this.isAddAccountFooterBusy(footerIndex))) {
          logger.debug(
            `✅ Step 2: Add account footer label ready after ${getElapsed()}s`,
          );
          break;
        }
        await sleep(pollInterval);
      }

      logger.debug('⏳ Step 3: Waiting 1 second...');
      await sleep(1000);
    } else {
      // Step 2: Wait for "Syncing" to disappear
      logger.debug('⏳ Step 2: Waiting for "Syncing" to disappear...');
      while (Date.now() - startTime < timeout) {
        if (!(await isTextVisible('Syncing'))) {
          logger.debug(
            `✅ Step 2: "Syncing" disappeared after ${getElapsed()}s`,
          );
          break;
        }
        await sleep(pollInterval);
      }

      // Step 3: Wait 1 second delay
      logger.debug('⏳ Step 3: Waiting 1 second...');
      await sleep(1000);

      // Step 4: Wait for "Discovering" to disappear
      logger.debug('⏳ Step 4: Waiting for "Discovering" to disappear...');
      while (Date.now() - startTime < timeout) {
        if (!(await isTextVisible('Discovering'))) {
          logger.debug(
            `✅ Step 4: "Discovering" disappeared after ${getElapsed()}s`,
          );
          break;
        }
        await sleep(pollInterval);
      }
    }

    if (
      FrameworkDetector.isAppium() &&
      options?.addAccountButtonIndex !== undefined
    ) {
      const remainingMs = Math.max(timeout - (Date.now() - startTime), 1000);
      logger.debug(
        `⏳ Step 5: Waiting up to ${remainingMs}ms for Add account control (index ${options.addAccountButtonIndex}) — re-querying each attempt...`,
      );

      await this.waitForAddAccountButtonReady(
        options.addAccountButtonIndex,
        remainingMs,
      );

      logger.debug(
        `✅ Step 5: Add account control is interactive after ${getElapsed()}s`,
      );
    }

    logger.debug(
      `✅ waitForSyncingToComplete: Completed after ${getElapsed()}s`,
    );
  }
}

export default new AccountListBottomSheet();
