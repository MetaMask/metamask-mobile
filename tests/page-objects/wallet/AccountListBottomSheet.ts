import { CellComponentSelectorsIDs } from '../../../app/component-library/components/Cells/Cell/CellComponent.testIds';
import {
  AccountListBottomSheetSelectorsIDs,
  AccountListBottomSheetSelectorsText,
} from '../../../app/components/Views/AccountSelector/AccountListBottomSheet.testIds';
import { WalletViewSelectorsIDs } from '../../../app/components/Views/Wallet/WalletView.testIds';
import { ConnectAccountBottomSheetSelectorsIDs } from '../../../app/components/Views/AccountConnect/ConnectAccountBottomSheet.testIds';
import { AccountCellIds } from '../../../app/component-library/components-temp/MultichainAccounts/AccountCell/AccountCell.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import UnifiedGestures from '../../framework/UnifiedGestures';
import {
  asPlaywrightElement,
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import {
  createLogger,
  encapsulatedAction,
  LogLevel,
  PlaywrightGestures,
} from '../../framework';

const logger = createLogger({
  name: 'AccountListBottomSheet',
  level: LogLevel.DEBUG,
});

class AccountListBottomSheet {
  /** Account list container - wdio uses getElementByText('Accounts') for Appium */
  get accountList(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          AccountListBottomSheetSelectorsText.ACCOUNTS_LIST_TITLE,
        ),
    });
  }

  get accountTypeLabel(): DetoxElement {
    return Matchers.getElementByID(
      AccountListBottomSheetSelectorsIDs.ACCOUNT_TYPE_LABEL,
    );
  }

  get accountTagLabel(): DetoxElement {
    return Matchers.getElementByID(CellComponentSelectorsIDs.TAG_LABEL);
  }

  get title(): DetoxElement {
    return Matchers.getElementByText(
      AccountListBottomSheetSelectorsText.ACCOUNTS_LIST_TITLE,
    );
  }

  /** Add wallet/account button - wdio tapOnAddWalletButton uses 'account-list-add-account-button' */
  get addAccountButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
          { exact: true },
        ),
    });
  }

  get addEthereumAccountButton(): DetoxElement {
    return Matchers.getElementByText(
      AccountListBottomSheetSelectorsText.ADD_ETHEREUM_ACCOUNT,
    );
  }

  get removeAccountAlertText(): DetoxElement {
    return Matchers.getElementByText(
      AccountListBottomSheetSelectorsText.REMOVE_IMPORTED_ACCOUNT,
    );
  }

  get connectAccountsButton(): DetoxElement {
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
          { exact: true },
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

  getAccountElementByAccountNameV2(accountName: string): DetoxElement {
    return Matchers.getElementByIDAndLabel(AccountCellIds.ADDRESS, accountName);
  }

  async getSelectElement(index: number): DetoxElement {
    return Matchers.getElementByID(CellComponentSelectorsIDs.SELECT, index);
  }

  async getMultiselectElement(index: number): Promise<DetoxElement> {
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
  getSelectWithMenuElementName(index: number): DetoxElement {
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
    });
  }

  async tapAddAccountButtonV2(options?: {
    srpIndex?: number;
    shouldWait?: boolean;
  }): Promise<void> {
    const button = Matchers.getElementByID(
      AccountListBottomSheetSelectorsIDs.CREATE_ACCOUNT,
      options?.srpIndex ?? 0,
    );

    await Gestures.waitAndTap(button, {
      elemDescription: 'Add Account button in V2 multichain accounts',
      delay: options?.shouldWait ? 5000 : 0,
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
        await PlaywrightGestures.scrollIntoView(
          await asPlaywrightElement(this.createAccountLink(0)),
          { scrollParams: { direction: 'down' } },
        );
        await PlaywrightGestures.waitAndTap(
          await asPlaywrightElement(this.createAccountLink(index)),
        );
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

  async tapAccountByNameV2(accountName: string): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        const accountEl = this.getAccountElementByAccountNameV2(accountName);
        await Gestures.waitAndTap(accountEl, {
          elemDescription: `Tap on account with name: ${accountName}`,
        });
      },
      appium: async () => {
        const accountEl =
          await PlaywrightMatchers.getElementByText(accountName);
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
  get ellipsisMenuButton(): DetoxElement {
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
    await Gestures.tapAtIndex(this.ellipsisMenuButton, accountIndex, {
      elemDescription: `V2 ellipsis menu button for account at index ${accountIndex}`,
      delay: shouldWait ? 1500 : 0,
    });
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

  /**
   * Waits for the account sync to complete.
   * @param timeout - The timeout in milliseconds.
   * @returns {Promise<void>} Resolves when the account sync is complete.
   */
  async waitForAccountSyncToComplete(timeout = 60000): Promise<void> {
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
    while (Date.now() - startTime < initialWaitTimeout) {
      const isSyncing = await isTextVisible('Syncing');
      const isDiscovering = await isTextVisible('Discovering');

      if (isSyncing || isDiscovering) {
        syncingDetected = true;
        logger.debug(
          `✅ Step 1: Loading detected after ${getElapsed()}s (Syncing: ${isSyncing}, Discovering: ${isDiscovering})`,
        );
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    // If nothing appeared after 5 seconds, we're done
    if (!syncingDetected) {
      logger.debug(
        `✅ waitForSyncingToComplete: No syncing detected after 5s, finishing after ${getElapsed()}s`,
      );
      return;
    }

    // Step 2: Wait for "Syncing" to disappear
    logger.debug('⏳ Step 2: Waiting for "Syncing" to disappear...');
    while (Date.now() - startTime < timeout) {
      if (!(await isTextVisible('Syncing'))) {
        logger.debug(`✅ Step 2: "Syncing" disappeared after ${getElapsed()}s`);
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    // Step 3: Wait 1 second delay
    logger.debug('⏳ Step 3: Waiting 1 second...');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Step 4: Wait for "Discovering" to disappear
    logger.debug('⏳ Step 4: Waiting for "Discovering" to disappear...');
    while (Date.now() - startTime < timeout) {
      if (!(await isTextVisible('Discovering'))) {
        logger.debug(
          `✅ Step 4: "Discovering" disappeared after ${getElapsed()}s`,
        );
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    logger.debug(
      `✅ waitForSyncingToComplete: Completed after ${getElapsed()}s`,
    );
  }
}

export default new AccountListBottomSheet();
