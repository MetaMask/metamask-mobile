import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import UnifiedGestures from '../../framework/UnifiedGestures';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';

const AddAccountBottomSheetSelectorsIDs = {
  IMPORT_ACCOUNT_BUTTON: 'add-account-import-account',
  IMPORT_SRP_BUTTON: 'add-account-srp-account',
};

class AddAccountBottomSheet {
  get importAccountButton(): DetoxElement {
    return Matchers.getElementByID(
      AddAccountBottomSheetSelectorsIDs.IMPORT_ACCOUNT_BUTTON,
    );
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

  async tapImportAccount(): Promise<void> {
    await Gestures.waitAndTap(this.importAccountButton, {
      elemDescription: 'Import Account button',
    });
  }

  async tapImportSrp(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.importSrpButton, {
      description: 'Import SRP button',
    });
  }
}

export default new AddAccountBottomSheet();
