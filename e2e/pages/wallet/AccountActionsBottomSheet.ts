import { AccountActionsBottomSheetSelectorsIDs } from '../../selectors/wallet/AccountActionsBottomSheet.selectors';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Utilities from '../../framework/Utilities';
import EditAccountNameView from './EditAccountNameView';
import MultichainAccountDetails from '../MultichainAccounts/AccountDetails';
import EditMultichainAccountName from '../MultichainAccounts/EditAccountName';
class AccountActionsBottomSheet {
  get editAccount(): DetoxElement {
    return Matchers.getElementByID(
      AccountActionsBottomSheetSelectorsIDs.EDIT_ACCOUNT,
    );
  }

  get showPrivateKey(): DetoxElement {
    return Matchers.getElementByID(
      AccountActionsBottomSheetSelectorsIDs.SHOW_PRIVATE_KEY,
    );
  }

  get switchToSmartAccount(): DetoxElement {
    return Matchers.getElementByID(
      AccountActionsBottomSheetSelectorsIDs.SWITCH_TO_SMART_ACCOUNT,
    );
  }

  get showSrp(): DetoxElement {
    return Matchers.getElementByID(
      AccountActionsBottomSheetSelectorsIDs.SHOW_SECRET_RECOVERY_PHRASE,
    );
  }

  async tapEditAccount(): Promise<void> {
    await Gestures.waitAndTap(this.editAccount, {
      elemDescription: 'Edit account button',
    });
  }

  async tapShowPrivateKey(): Promise<void> {
    await Gestures.waitAndTap(this.showPrivateKey, {
      elemDescription: 'Show private key button',
    });
  }

  async tapSwitchToSmartAccount(): Promise<void> {
    await Gestures.waitAndTap(this.switchToSmartAccount, {
      elemDescription: 'Switch to smart account button',
    });
  }

  async tapShowSRP(): Promise<void> {
    await Gestures.waitAndTap(this.showSrp, {
      elemDescription: 'Show secret recovery phrase button',
    });
  }

  /**
   * This method adapts to feature flag changes for multichain accounts.
   */
  async renameActiveAccount(newName: string): Promise<void> {
    const isMultichainFlow = await this.detectMultichainFlow();
    if (isMultichainFlow) {
      await this.handleMultichainRename(newName);
    } else {
      await this.tapEditAccount();
      await this.handleLegacyRename(newName);
    }
  }

  /**
   * Detects whether the multichain account details UI is currently shown.
   * Returns true if multichain flow is active, false if legacy flow is active.
   */
  private async detectMultichainFlow(): Promise<boolean> {
    const isMultichainVisible = await Utilities.isElementVisible(
      MultichainAccountDetails.container,
      5000,
    );

    if (isMultichainVisible) {
      return true;
    }

    const isLegacyVisible = await Utilities.isElementVisible(
      this.editAccount,
      5000,
    );
    if (isLegacyVisible) {
      return false;
    }

    throw new Error(
      'Unable to detect rename UI flow - neither multichain nor legacy UI elements found',
    );
  }

  /**
   * Handles the modern multichain rename flow
   */
  private async handleMultichainRename(newName: string): Promise<void> {
    await Utilities.waitForElementToBeVisible(
      MultichainAccountDetails.container,
      5000,
    );
    await MultichainAccountDetails.tapEditAccountName();
    await EditMultichainAccountName.updateAccountName(newName);
    await EditMultichainAccountName.tapSave();
    await MultichainAccountDetails.tapBackButton();
  }

  /**
   * Handles the legacy rename flow
   */
  private async handleLegacyRename(newName: string): Promise<void> {
    await Gestures.typeText(EditAccountNameView.accountNameInput, newName, {
      hideKeyboard: true,
      clearFirst: true,
    });
    await EditAccountNameView.tapSave();
  }

  /**
   * Force multichain rename flow (for testing edge cases - use with mocked feature flag)
   * Use renameActiveAccount() instead for normal scenarios
   */
  async renameActiveAccountMultichain(newName: string): Promise<void> {
    await this.handleMultichainRename(newName);
  }

  /**
   * Force legacy rename flow (for testing edge cases - use with mocked feature flag)
   * Use renameActiveAccount() instead for normal scenarios
   */
  async renameActiveAccountLegacy(newName: string): Promise<void> {
    await this.tapEditAccount();
    await this.handleLegacyRename(newName);
  }
}

export default new AccountActionsBottomSheet();
