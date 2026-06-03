import { AccountActionsBottomSheetSelectorsIDs } from '../../../app/components/Views/AccountActions/AccountActionsBottomSheet.testIds';
import Matchers from '../../framework/Matchers';
import Utilities from '../../framework/Utilities';
import EditAccountNameView from './EditAccountNameView';
import MultichainAccountDetails from '../MultichainAccounts/AccountDetails';
import MultichainEditAccountName from '../MultichainAccounts/EditAccountName';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';
class AccountActionsBottomSheet {
  get editAccount(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          AccountActionsBottomSheetSelectorsIDs.EDIT_ACCOUNT,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          AccountActionsBottomSheetSelectorsIDs.EDIT_ACCOUNT,
        ),
    });
  }

  get showPrivateKey(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          AccountActionsBottomSheetSelectorsIDs.SHOW_PRIVATE_KEY,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          AccountActionsBottomSheetSelectorsIDs.SHOW_PRIVATE_KEY,
        ),
    });
  }

  get switchToSmartAccount(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          AccountActionsBottomSheetSelectorsIDs.SWITCH_TO_SMART_ACCOUNT,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          AccountActionsBottomSheetSelectorsIDs.SWITCH_TO_SMART_ACCOUNT,
        ),
    });
  }

  get showSrp(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          AccountActionsBottomSheetSelectorsIDs.SHOW_SECRET_RECOVERY_PHRASE,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          AccountActionsBottomSheetSelectorsIDs.SHOW_SECRET_RECOVERY_PHRASE,
        ),
    });
  }

  get multichainEditName(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          AccountActionsBottomSheetSelectorsIDs.MULTICHAIN_EDIT_NAME,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          AccountActionsBottomSheetSelectorsIDs.MULTICHAIN_EDIT_NAME,
        ),
    });
  }

  get multichainAccountDetails(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          AccountActionsBottomSheetSelectorsIDs.MULTICHAIN_ACCOUNT_DETAILS,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          AccountActionsBottomSheetSelectorsIDs.MULTICHAIN_ACCOUNT_DETAILS,
        ),
    });
  }

  async tapEditAccount(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.editAccount, {
      elemDescription: 'Edit account button',
    });
  }

  async tapShowPrivateKey(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.showPrivateKey, {
      elemDescription: 'Show private key button',
    });
  }

  async tapSwitchToSmartAccount(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.switchToSmartAccount, {
      elemDescription: 'Switch to smart account button',
    });
  }

  async tapShowSRP(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.showSrp, {
      elemDescription: 'Show secret recovery phrase button',
    });
  }

  async tapRenameAccount(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.multichainEditName, {
      elemDescription: 'Edit Account Name button in V2 account actions modal',
    });
  }

  async tapAccountDetails(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.multichainAccountDetails, {
      elemDescription: 'Account Details button in V2 account actions modal',
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
    await MultichainEditAccountName.updateAccountName(newName);
    await MultichainEditAccountName.tapSave();
    await MultichainAccountDetails.tapBackButton();
  }

  /**
   * Handles the legacy rename flow
   */
  private async handleLegacyRename(newName: string): Promise<void> {
    await UnifiedGestures.typeText(
      EditAccountNameView.accountNameInput,
      newName,
      {
        hideKeyboard: true,
        clearFirst: true,
      },
    );
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
