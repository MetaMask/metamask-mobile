import { AccountHubSelectorsIDs } from '../../../app/components/Views/AccountHub/AccountHub.testIds';
import {
  ManageAccountsViewSelectorsIDs,
  getManageAccountRowId,
  getManageAccountRowEyeToggleId,
  getManageAccountRowRemoveId,
  getManageAccountSectionHeaderId,
} from '../../../app/components/Views/ManageAccounts/ManageAccounts.testIds';
import { AccountListBottomSheetSelectorsIDs } from '../../../app/components/Views/AccountSelector/AccountListBottomSheet.testIds';
import AccountListBottomSheet from '../wallet/AccountListBottomSheet';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { type AppiumElement, Utilities } from '../../framework';

const MANAGE_ACCOUNTS_READY_TIMEOUT_MS = 20_000;

/**
 * Page object for the Manage Accounts screen (`Routes.MANAGE_ACCOUNTS_VIEW`).
 *
 * Rows, cells and toggles repeat per account group and embed the group ID in
 * their test IDs (`entropy:<entropySource>/<groupIndex>`). Callers pass the
 * group ID explicitly; for fixtures whose vault carries a deterministic entropy
 * source the ID is known ahead of time (see
 * {@link DEFAULT_FIXTURE_HD_KEYRING_1_ID}).
 */
class ManageAccounts {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(ManageAccountsViewSelectorsIDs.CONTAINER);
  }

  get accountList(): Promise<AppiumElement> {
    return Matchers.getElementByID(ManageAccountsViewSelectorsIDs.ACCOUNT_LIST);
  }

  /** Row (whole account group) for a given account group ID. */
  getRow(groupId: string): Promise<AppiumElement> {
    return Matchers.getElementByID(getManageAccountRowId(groupId));
  }

  /** Eye / eye-slash hide toggle for a given account group ID. */
  getHideToggle(groupId: string): Promise<AppiumElement> {
    return Matchers.getElementByID(getManageAccountRowEyeToggleId(groupId));
  }

  /** Minus / remove control for a given account group ID (imported private-key groups). */
  getRemoveButton(groupId: string): Promise<AppiumElement> {
    return Matchers.getElementByID(getManageAccountRowRemoveId(groupId));
  }

  /** Wallet section header for a given wallet display name (e.g. `Wallet 1`). */
  getSectionHeader(walletName: string): Promise<AppiumElement> {
    return Matchers.getElementByID(getManageAccountSectionHeaderId(walletName));
  }

  /**
   * Waits until the Manage Accounts screen is actually rendered. Avoids
   * interacting with the previous (account list) screen while the push
   * animation is still running.
   */
  async waitForManageAccountsVisible(
    timeout = MANAGE_ACCOUNTS_READY_TIMEOUT_MS,
  ): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        const el = await this.container;
        if (!(await el.isVisible().catch(() => false))) {
          throw new Error('Manage Accounts screen is not visible yet');
        }
      },
      {
        timeout,
        interval: 500,
        description: 'Manage Accounts screen visible',
      },
    );
  }

  /**
   * Opens the Manage Accounts screen from the account list. The gear lives in
   * the account list / account hub header, so this assumes the account list is
   * already open. Both header variants register a gear testID, so probe
   * whichever is present.
   */
  async tapManageAccountsButton(): Promise<void> {
    const candidates = [
      AccountHubSelectorsIDs.MANAGE_ACCOUNTS_BUTTON,
      AccountListBottomSheetSelectorsIDs.MANAGE_ACCOUNTS_BUTTON,
    ];

    const present = await Utilities.executeWithRetry(
      async () => {
        for (const id of candidates) {
          const el = await Matchers.getElementByID(id);
          if (
            await el
              .unwrap()
              .isExisting()
              .catch(() => false)
          ) {
            return id;
          }
        }
        throw new Error('Manage accounts button not found in account list');
      },
      {
        timeout: MANAGE_ACCOUNTS_READY_TIMEOUT_MS,
        interval: 500,
        description: 'Manage accounts button present',
      },
    );

    await Gestures.waitAndTap(await Matchers.getElementByID(present), {
      elemDescription: 'Manage accounts button',
      timeout: MANAGE_ACCOUNTS_READY_TIMEOUT_MS,
      checkForDisplayed: true,
      waitForInteractive: true,
    });
    await this.waitForManageAccountsVisible();
  }

  /**
   * Taps the remove (minus) control of an imported private-key account group,
   * opening the remove-account confirmation sheet.
   *
   * @param groupId - The imported private-key account group ID
   * (`keyring:Simple Key Pair/<address>`).
   */
  async tapRemoveButton(groupId: string): Promise<void> {
    await Gestures.scrollIntoView(this.getRemoveButton(groupId), {
      direction: 'down',
      maxScrolls: 10,
    });
    await Gestures.waitAndTap(this.getRemoveButton(groupId), {
      elemDescription: `Remove button for account group ${groupId}`,
      checkForDisplayed: true,
      waitForInteractive: true,
    });
  }

  /** Taps the back button to return to the account list. */
  async tapBackButton(): Promise<void> {
    await Gestures.waitAndTap(
      Matchers.getElementByID(ManageAccountsViewSelectorsIDs.BACK_BUTTON),
      {
        elemDescription: 'Manage accounts back button',
        checkForDisplayed: true,
        waitForInteractive: true,
      },
    );
  }

  /** Taps back and waits for the account list to be visible again. */
  async tapBackToAccountList(): Promise<void> {
    await this.waitForManageAccountsVisible();
    await this.tapBackButton();
    await AccountListBottomSheet.waitForAccountListVisible();
  }

  /**
   * Toggles the hidden state of an account group by tapping its eye control.
   *
   * @param groupId - The account group ID (`entropy:<entropySource>/<index>`
   * or `keyring:<type>/<subId>` for hideable hardware groups).
   */
  async tapHideToggle(groupId: string): Promise<void> {
    await Gestures.scrollIntoView(this.getHideToggle(groupId), {
      direction: 'down',
      maxScrolls: 10,
    });
    await Gestures.waitAndTap(this.getHideToggle(groupId), {
      elemDescription: `Hide toggle for account group ${groupId}`,
      checkForDisplayed: true,
      waitForInteractive: true,
    });
  }
}

export default new ManageAccounts();
