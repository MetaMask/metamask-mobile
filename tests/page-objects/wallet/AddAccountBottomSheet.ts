import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Assertions from '../../framework/Assertions';
import UnifiedGestures from '../../framework/UnifiedGestures';
import PlaywrightAssertions from '../../framework/PlaywrightAssertions';
import {
  asPlaywrightElement,
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';

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
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          AddAccountBottomSheetSelectorsIDs.IMPORT_SRP_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          AddAccountBottomSheetSelectorsIDs.IMPORT_SRP_BUTTON,
          { exact: true },
        ),
    });
  }

  async waitForImportSrpOption(
    options: { description?: string; timeout?: number } = {},
  ): Promise<void> {
    const timeout = options.timeout ?? SHEET_READY_TIMEOUT_MS;
    const description =
      options.description ??
      'Import SRP option should be visible in add account sheet';

    await encapsulatedAction({
      detox: async () => {
        await Assertions.expectElementToBeVisible(this.importSrpButton, {
          description,
          timeout,
        });
      },
      appium: async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          await asPlaywrightElement(this.importSrpButton),
          { description, timeout },
        );
      },
    });
  }

  async waitForImportAccountOption(
    options: { description?: string; timeout?: number } = {},
  ): Promise<void> {
    const timeout = options.timeout ?? SHEET_READY_TIMEOUT_MS;
    const description =
      options.description ??
      'Import account option should be visible in add account sheet';

    await encapsulatedAction({
      detox: async () => {
        await Assertions.expectElementToBeVisible(this.importAccountButton, {
          description,
          timeout,
        });
      },
      appium: async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          await asPlaywrightElement(this.importAccountButton),
          { description, timeout },
        );
      },
    });
  }

  async tapImportAccount(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.importAccountButton, {
      description: 'Import Account button',
      timeout: 20_000,
      checkForDisplayed: true,
      checkForEnabled: true,
      waitForInteractive: true,
      enabledStableReads: 3,
      postEnabledSettleMs: 250,
    });
  }

  async tapImportSrp(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.importSrpButton, {
      description: 'Import SRP button',
      timeout: 20_000,
      checkForDisplayed: true,
      checkForEnabled: true,
      waitForInteractive: true,
      enabledStableReads: 3,
      postEnabledSettleMs: 250,
    });
  }

  async tapBackToWalletView(): Promise<void> {
    await Gestures.waitAndTap(this.backButton, {
      elemDescription: 'Back button',
    });
  }
}

export default new AddAccountBottomSheet();
