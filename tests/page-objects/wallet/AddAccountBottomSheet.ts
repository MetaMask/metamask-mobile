import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Assertions from '../../framework/Assertions';
import { EncapsulatedElementType } from '../../framework/EncapsulatedElement';

const SHEET_READY_TIMEOUT_MS = 30_000;

const AddAccountBottomSheetSelectorsIDs = {
  IMPORT_ACCOUNT_BUTTON: 'add-account-import-account',
  IMPORT_SRP_BUTTON: 'add-account-srp-account',
};

class AddAccountBottomSheet {
  get importAccountButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      AddAccountBottomSheetSelectorsIDs.IMPORT_ACCOUNT_BUTTON,
    );
  }

  get backButton(): EncapsulatedElementType {
    return Matchers.getElementByID('add-wallet-back-button');
  }

  get importSrpButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      AddAccountBottomSheetSelectorsIDs.IMPORT_SRP_BUTTON,
    );
  }

  async waitForImportSrpOption(
    options: { description?: string; timeout?: number } = {},
  ): Promise<void> {
    const timeout = options.timeout ?? SHEET_READY_TIMEOUT_MS;
    const description =
      options.description ??
      'Import SRP option should be visible in add account sheet';

    await Assertions.expectElementToBeVisible(this.importSrpButton, {
      description,
      timeout,
    });
  }

  async waitForImportAccountOption(
    options: { description?: string; timeout?: number } = {},
  ): Promise<void> {
    const timeout = options.timeout ?? SHEET_READY_TIMEOUT_MS;
    const description =
      options.description ??
      'Import account option should be visible in add account sheet';

    await Assertions.expectElementToBeVisible(this.importAccountButton, {
      description,
      timeout,
    });
  }

  async tapImportAccount(): Promise<void> {
    await Gestures.waitAndTap(this.importAccountButton, {
      elemDescription: 'Import Account button',
      timeout: 20_000,
      checkForDisplayed: true,
      checkEnabled: true,
      waitForInteractive: true,
    });
  }

  async tapImportSrp(): Promise<void> {
    await Gestures.waitAndTap(this.importSrpButton, {
      elemDescription: 'Import SRP button',
      timeout: 20_000,
      checkForDisplayed: true,
      checkEnabled: true,
      waitForInteractive: true,
    });
  }

  async tapBackToWalletView(): Promise<void> {
    await Gestures.waitAndTap(this.backButton, {
      elemDescription: 'Back button',
    });
  }
}

export default new AddAccountBottomSheet();
