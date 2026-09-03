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
import {
  type AppiumElement,
  createLogger,
  getDriver,
  LogLevel,
  sleep,
  Utilities,
} from '../../framework';
import { PlatformDetector } from '../../framework/PlatformLocator';
import AddAccountBottomSheet from './AddAccountBottomSheet';
import WalletView from './WalletView';

const ADD_ACCOUNT_SHEET_TIMEOUT_MS = 30_000;

const logger = createLogger({
  name: 'AccountListBottomSheet',
  level: LogLevel.DEBUG,
});

class AccountListBottomSheet {
  /**
   * Account list container.
   * Appium iOS: header title text — `account-list` is on a wrapper XCTest keeps
   * `visible=false` while the sheet is open; "Accounts" is reliably displayed.
   * Appium Android: `account-list` testID.
   */
  get accountList(): Promise<AppiumElement> {
    if (PlatformDetector.isIOS()) {
      // Exact match: contains("Accounts") also hits "Connect accounts" /
      // "Edit accounts" nodes that can exist while displayed=false.
      const title = AccountListBottomSheetSelectorsText.ACCOUNTS_LIST_TITLE;
      return Matchers.getElementByNativeXPath(
        `//*[@name='${title}' or @label='${title}' or @text='${title}']`,
      );
    }
    return Matchers.getElementByID(
      AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID,
    );
  }

  get accountTypeLabel(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      AccountListBottomSheetSelectorsIDs.ACCOUNT_TYPE_LABEL,
    );
  }

  get accountTagLabel(): Promise<AppiumElement> {
    return Matchers.getElementByID(CellComponentSelectorsIDs.TAG_LABEL);
  }

  get title(): Promise<AppiumElement> {
    return Matchers.getElementByText(
      AccountListBottomSheetSelectorsText.ACCOUNTS_LIST_TITLE,
    );
  }

  /** Header back control (same testID as CommonView.backButton / AccountSelector HeaderCompactStandard). */
  get backButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(CommonSelectorsIDs.BACK_ARROW_BUTTON);
  }

  /** Add wallet/account button - wdio tapOnAddWalletButton uses 'account-list-add-account-button' */
  get addAccountButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
    );
  }

  get addWalletButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
    );
  }

  get addEthereumAccountButton(): Promise<AppiumElement> {
    return Matchers.getElementByText(
      AccountListBottomSheetSelectorsText.ADD_ETHEREUM_ACCOUNT,
    );
  }

  get removeAccountAlertText(): Promise<AppiumElement> {
    return Matchers.getElementByText(
      AccountListBottomSheetSelectorsText.REMOVE_IMPORTED_ACCOUNT,
    );
  }

  get connectAccountsButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON,
    );
  }

  createAccountLink(index: number): Promise<AppiumElement> {
    return Matchers.getElementByID(
      AccountListBottomSheetSelectorsIDs.CREATE_ACCOUNT,
      index,
    );
  }

  async getAccountElementByAccountName(
    accountName: string,
  ): Promise<AppiumElement> {
    return Matchers.getElementByIDAndLabel(
      CellComponentSelectorsIDs.BASE_TITLE,
      accountName,
    );
  }

  getAccountElementByAccountNameV2(
    accountName: string,
  ): Promise<AppiumElement> {
    return Matchers.getElementByText(accountName);
  }

  /**
   * Appium-only: return every element matching the given account name.
   * Use when the count of matches is meaningful (e.g. the same name appears
   * under multiple SRPs). The singular variant only resolves to one element,
   * so a visibility check there can mask a missing duplicate.
   *
   * @param exactMatch - When false (default), match account names that contain
   * the given string (e.g. "Account 3" matches "Account 3 (2)").
   */
  async getAccountElementsByAccountNameV2(
    accountName: string,
    exactMatch: boolean = false,
  ): Promise<AppiumElement[]> {
    const escapedAccountName = accountName.replace(/'/g, "\\'");
    if (PlatformDetector.isAndroid()) {
      // Anchor on the name text, then step up to the tappable row — immune to
      // the RN view flattening that detaches the row from its CONTAINER.
      const textPredicate = exactMatch
        ? `@text='${escapedAccountName}'`
        : `contains(@text,'${escapedAccountName}')`;
      return Matchers.getAllElementsByXPath(
        `//*[@resource-id='${AccountCellIds.ADDRESS}' and ${textPredicate}]/ancestor::*[@resource-id='${AccountCellIds.SELECT}'][1]`,
      );
    }

    // iOS collapses the row's children, so match the row itself: name is the
    // testID, label aggregates to the account name.
    const labelPredicate = exactMatch
      ? `@label='${escapedAccountName}'`
      : `contains(@label,'${escapedAccountName}')`;
    return Matchers.getAllElementsByXPath(
      `//*[@name='${AccountCellIds.SELECT}' and ${labelPredicate}]`,
    );
  }

  getSelectElement(index: number): Promise<AppiumElement> {
    return Matchers.getElementByID(CellComponentSelectorsIDs.SELECT, index);
  }

  getMultiselectElement(index: number): Promise<AppiumElement> {
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
   * @returns The matcher for the element's title/name.
   */
  getSelectWithMenuElementName(index: number): Promise<AppiumElement> {
    return Matchers.getElementByID(CellComponentSelectorsIDs.BASE_TITLE, index);
  }

  async tapEditAccountActionsAtIndex(index: number): Promise<void> {
    await Gestures.tapAtIndex(
      Matchers.getElementByID(WalletViewSelectorsIDs.ACCOUNT_ACTIONS),
      index,
    );
  }

  accountNameInList(accountName: string): Promise<AppiumElement> {
    return Matchers.getElementByNativeXPath(this.getCatchAllXPath(accountName));
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
    await Gestures.waitAndTap(this.addAccountButton, {
      elemDescription: 'Add Account button',
      timeout: 20_000,
      checkForDisplayed: true,
      checkEnabled: true,
      waitForInteractive: true,
    });
  }

  async tapAddWalletButton(): Promise<void> {
    await Gestures.waitAndTap(this.addWalletButton, {
      elemDescription: 'Add Wallet button',
      timeout: 20_000,
      checkForDisplayed: true,
      checkEnabled: true,
      waitForInteractive: true,
    });
  }

  async openAddAccountSheet(): Promise<void> {
    await this.waitForAccountSyncToComplete();
    await this.tapAddAccountButton();
    await AddAccountBottomSheet.waitForImportSrpOption({
      timeout: ADD_ACCOUNT_SHEET_TIMEOUT_MS,
    });
  }

  async openAddWalletSheet(): Promise<void> {
    await this.waitForAccountSyncToComplete();
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
    await Utilities.executeWithRetry(
      async () => {
        let el: AppiumElement;
        try {
          el = (await this.accountList) as AppiumElement;
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
    const buttonIndex = options?.srpIndex ?? 0;

    // Account sync/discovery can keep the row visible but not yet tappable.
    // Wait for the sync phase to settle before tapping "Add account".
    await this.waitForAccountSyncToComplete(90_000, {
      addAccountButtonIndex: buttonIndex,
    });

    // Re-query after sync settle — never reuse a pre-sync element handle.
    const tapTarget = await this.getAddAccountButtonTapTarget(buttonIndex);

    await Gestures.waitAndTap(Promise.resolve(tapTarget), {
      delay: options?.shouldWait ? 5000 : 0,
      timeout: 20_000,
      checkForDisplayed: true,
      checkEnabled: true,
      waitForInteractive: true,
      elemDescription: 'Add Account button in V2 multichain accounts',
    });
  }

  async tapAddEthereumAccountButton(): Promise<void> {
    await Gestures.waitAndTap(this.addEthereumAccountButton, {
      elemDescription: 'Add Ethereum Account button',
    });
  }

  async tapCreateAccount(index: number): Promise<void> {
    const link = this.createAccountLink(index);
    await Gestures.scrollIntoView(link, {
      direction: 'down',
    });
    await Gestures.waitAndTap(link, {
      elemDescription: 'Create account link',
    });
    await this.waitForAccountSyncToComplete(10000, {
      addAccountButtonIndex: index,
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
    const name = Matchers.getElementByText(accountName);
    await Gestures.scrollIntoView(name);
    await Gestures.waitAndTap(name, {
      elemDescription: `Account "${accountName}"`,
    });
    await WalletView.checkActiveAccount(accountName);
  }

  async tapAccountByNameV2(
    accountName: string,
    exactMatch: boolean = false,
  ): Promise<void> {
    if (PlatformDetector.isAndroid()) {
      await Utilities.executeWithRetry(
        async () => {
          const cells = await this.getAccountElementsByAccountNameV2(
            accountName,
            exactMatch,
          );
          if (cells.length === 0) {
            throw new Error(`No account row found for "${accountName}"`);
          }

          const cell = cells[cells.length - 1];
          for (const direction of ['up', 'down'] as const) {
            try {
              await Gestures.scrollIntoView(cell, {
                direction,
                maxScrolls: 10,
              });
              if (await cell.isVisible()) {
                await Gestures.waitAndTap(Promise.resolve(cell), {
                  elemDescription: `Tap on account with name: ${accountName}`,
                });
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

    const escapedAccountName = accountName.replace(/'/g, "\\'");
    const accountEl = exactMatch
      ? Matchers.getElementByNativeXPath(
          `//*[@name='${escapedAccountName}' or @label='${escapedAccountName}' or @text='${escapedAccountName}']`,
        )
      : Matchers.getElementByText(accountName);
    await Gestures.scrollIntoView(accountEl);
    await Gestures.waitAndTap(accountEl, {
      elemDescription: `Tap on account with name: ${accountName}`,
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
    await Gestures.swipe(this.accountList, 'up', {
      speed: 'fast',
      elemDescription: 'Scroll to bottom of account list',
    });
  }

  // V2 Multichain Accounts Methods
  get ellipsisMenuButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(AccountCellIds.MENU);
  }

  /**
   * Get the ellipsis menu button for a specific account by index
   * @param accountIndex - The index of the account (0-based)
   * @returns The ellipsis menu element at the specified index
   */
  async getEllipsisMenuButtonAtIndex(
    accountIndex: number,
  ): Promise<AppiumElement> {
    return Matchers.getElementByID(AccountCellIds.MENU, accountIndex);
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
    const accountCells =
      await this.getAccountElementsByAccountNameV2(accountName);
    if (accountCells.length === 0) {
      throw new Error(`No account row found for "${accountName}"`);
    }

    const accountCell = accountCells[accountCells.length - 1];
    await Gestures.scrollIntoView(accountCell);

    const menuEl = await this.getAccountEllipsisMenuByNameXPath(accountName);
    if (menuEl) {
      await Gestures.waitAndTap(Promise.resolve(menuEl), {
        elemDescription: `Ellipsis menu for "${accountName}"`,
        timeout: 15_000,
        checkForDisplayed: false,
        checkEnabled: false,
      });
      return;
    }

    if (PlatformDetector.isIOS()) {
      await this.tapAccountEllipsisAlignedToRowIos(accountCell, accountName);
      return;
    }

    const menuIndex =
      await this.getAccountEllipsisMenuIndexByAddress(accountName);
    await this.tapAccountEllipsisButtonV2(menuIndex, { shouldWait: true });
  }

  /**
   * Resolve the ellipsis for `accountName` via CONTAINER/parent-scoped XPath.
   * TODO: Add TestIds for element
   */
  private async getAccountEllipsisMenuByNameXPath(
    accountName: string,
  ): Promise<AppiumElement | undefined> {
    const escaped = accountName.replace(/'/g, "\\'");
    const menu = AccountCellIds.MENU;
    const xpaths = PlatformDetector.isAndroid()
      ? [
          `//*[@resource-id='${AccountCellIds.ADDRESS}' and @text='${escaped}']/ancestor::*[@resource-id='${AccountCellIds.CONTAINER}'][1]//*[@resource-id='${menu}' or @resource-id='${menu}-${escaped}' or starts-with(@resource-id,'${menu}-')]`,
          `//*[@resource-id='${AccountCellIds.ADDRESS}' and contains(@text,'${escaped}')]/ancestor::*[@resource-id='${AccountCellIds.CONTAINER}'][1]//*[@resource-id='${menu}' or starts-with(@resource-id,'${menu}-')]`,
        ]
      : [
          `//*[@name='${AccountCellIds.SELECT}' and contains(@label,'${escaped}')]/parent::*//*[@name='${menu}' or @name='${menu}-${escaped}' or starts-with(@name,'${menu}-')]`,
          `//*[@name='${AccountCellIds.CONTAINER}'][.//*[@name='${AccountCellIds.SELECT}' and contains(@label,'${escaped}')]]//*[@name='${menu}' or starts-with(@name,'${menu}-')]`,
          `//*[@name='${AccountCellIds.ADDRESS}' and contains(@label,'${escaped}')]/ancestor::*[@name='${AccountCellIds.CONTAINER}'][1]//*[@name='${menu}' or starts-with(@name,'${menu}-')]`,
        ];

    for (const xpath of xpaths) {
      const menus = await Matchers.getAllElementsByXPath(xpath);
      if (menus.length > 0) {
        return menus[menus.length - 1];
      }
    }
    return undefined;
  }

  private async getAccountEllipsisMenuIndexByAddress(
    accountName: string,
  ): Promise<number> {
    const addressAttr = PlatformDetector.isAndroid()
      ? `@resource-id='${AccountCellIds.ADDRESS}'`
      : `@name='${AccountCellIds.ADDRESS}'`;
    const addressElements = await Matchers.getAllElementsByXPath(
      `//*[${addressAttr}]`,
    );

    let menuIndex = -1;
    for (let i = 0; i < addressElements.length; i++) {
      const text = (await addressElements[i].textContent()).trim();
      if (text === accountName) {
        menuIndex = i;
      }
    }

    if (menuIndex < 0) {
      throw new Error(
        `Could not resolve ellipsis menu for account "${accountName}" via XPath or address index`,
      );
    }
    return menuIndex;
  }

  /**
   * iOS-only: Needed when the accessibility tree flattens CONTAINER
   * so parent-scoped XPath cannot reach the ellipsis.
   */
  private async tapAccountEllipsisAlignedToRowIos(
    accountCell: AppiumElement,
    accountName: string,
  ): Promise<void> {
    const drv = getDriver();
    if (!drv) {
      throw new Error('Driver is not available');
    }

    const rowLocation = await accountCell.unwrap().getLocation();
    const rowSize = await accountCell.unwrap().getSize();
    const rowCenterY = rowLocation.y + rowSize.height / 2;

    const menuElements = await Matchers.getAllElementsByXPath(
      `//*[@name='${AccountCellIds.MENU}' or starts-with(@name,'${AccountCellIds.MENU}-')]`,
    );
    if (menuElements.length === 0) {
      throw new Error(
        `No ellipsis menu buttons found while targeting "${accountName}"`,
      );
    }

    let bestMenu = menuElements[0];
    let bestDelta = Number.POSITIVE_INFINITY;
    for (const menu of menuElements) {
      const menuLocation = await menu.unwrap().getLocation();
      const menuSize = await menu.unwrap().getSize();
      const menuCenterY = menuLocation.y + menuSize.height / 2;
      const delta = Math.abs(menuCenterY - rowCenterY);
      if (delta < bestDelta) {
        bestDelta = delta;
        bestMenu = menu;
      }
    }

    if (bestDelta > Math.max(rowSize.height, 48)) {
      throw new Error(
        `Could not align ellipsis menu to "${accountName}" (Δy=${Math.round(bestDelta)})`,
      );
    }

    const menuLocation = await bestMenu.unwrap().getLocation();
    const menuSize = await bestMenu.unwrap().getSize();
    const x = Math.floor(menuLocation.x + menuSize.width / 2);
    const y = Math.floor(menuLocation.y + menuSize.height / 2);

    await drv
      .action('pointer', {
        parameters: { pointerType: 'touch' },
      })
      .move({ x, y })
      .down()
      .pause(80)
      .up()
      .perform();
  }

  async expectAccountVisibleByNameV2(
    accountName: string,
    options: { description?: string; timeout?: number } = {},
  ): Promise<void> {
    const timeout = options.timeout ?? 15_000;
    const description =
      options.description ?? `${accountName} should be visible in account list`;

    await Utilities.executeWithRetry(
      async () => {
        const cells = await this.getAccountElementsByAccountNameV2(accountName);
        if (cells.length === 0) {
          return false;
        }

        const cell = cells[0];
        for (const direction of ['up', 'down'] as const) {
          try {
            await Gestures.scrollIntoView(cell, {
              direction,
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

  /** Catch-all XPath for id/text/content-desc (Android) or name/label/text (iOS). */
  private getCatchAllXPath(identifier: string): string {
    if (PlatformDetector.isAndroid()) {
      return `//*[@resource-id='${identifier}' or contains(@text,'${identifier}') or contains(@content-desc,'${identifier}')]`;
    }
    return `//*[contains(@name,'${identifier}') or contains(@label,'${identifier}') or contains(@text,'${identifier}')]`;
  }

  /**
   * Appium: fresh lookup of the V2 footer label (`CREATE_ACCOUNT` testID).
   */
  private async getAddAccountButtonLabel(
    srpIndex: number,
  ): Promise<AppiumElement> {
    return Matchers.getElementByID(
      AccountListBottomSheetSelectorsIDs.CREATE_ACCOUNT,
      srpIndex,
    ) as Promise<AppiumElement>;
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
  ): Promise<AppiumElement> {
    const createAccountId = AccountListBottomSheetSelectorsIDs.CREATE_ACCOUNT;

    if (PlatformDetector.isAndroid()) {
      return Matchers.getElementByNativeXPath(
        `(//*[@resource-id='${createAccountId}'])[${srpIndex + 1}]/ancestor::*[@clickable='true'][1]`,
      );
    }

    return Matchers.getElementByID(
      createAccountId,
      srpIndex,
    ) as Promise<AppiumElement>;
  }

  /**
   * Appium: poll with fresh DOM queries until the footer label reads "Add account".
   * Interactive settle is handled by Gestures.waitAndTap({ waitForInteractive: true })
   * at the tap call site.
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
    const initialWaitTimeout = 2000; // 2 seconds to wait for syncing/discovering to appear

    const getElapsed = () => ((Date.now() - startTime) / 1000).toFixed(1);

    /** Safely check if a text element is visible — returns false if not found. */
    const isTextVisible = async (text: string): Promise<boolean> => {
      try {
        const el = (await Matchers.getElementByNativeXPath(
          this.getCatchAllXPath(text),
        )) as AppiumElement;
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

    if (options?.addAccountButtonIndex !== undefined) {
      const remainingMs = Math.max(timeout - (Date.now() - startTime), 1000);
      logger.debug(
        `⏳ Step 5: Waiting up to ${remainingMs}ms for Add account control (index ${options.addAccountButtonIndex}) — re-querying each attempt...`,
      );

      await this.waitForAddAccountButtonReady(
        options.addAccountButtonIndex,
        remainingMs,
      );

      logger.debug(
        `✅ Step 5: Add account control is ready after ${getElapsed()}s`,
      );
    }

    logger.debug(
      `✅ waitForSyncingToComplete: Completed after ${getElapsed()}s`,
    );
  }
}

export default new AccountListBottomSheet();
