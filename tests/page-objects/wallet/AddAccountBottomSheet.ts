import { AddAccountBottomSheetSelectorsIDs } from '../../../app/components/Views/AddAccountActions/AddAccountBottomSheet.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import UnifiedGestures from '../../framework/UnifiedGestures';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';

class AddAccountBottomSheet {
  get importAccountButton(): DetoxElement {
    return Matchers.getElementByID(
      AddAccountBottomSheetSelectorsIDs.IMPORT_ACCOUNT_BUTTON,
    );
  }

  get createEthereumAccountButton(): DetoxElement {
    return Matchers.getElementByID(
      AddAccountBottomSheetSelectorsIDs.ADD_ETHEREUM_ACCOUNT_BUTTON,
    );
  }

  get createSolanaAccountButton(): DetoxElement {
    return Matchers.getElementByID(
      AddAccountBottomSheetSelectorsIDs.ADD_SOLANA_ACCOUNT_BUTTON,
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

  async tapCreateEthereumAccount(): Promise<void> {
    await Gestures.waitAndTap(this.createEthereumAccountButton, {
      elemDescription: 'Create New Ethereum Account button',
    });
  }

  async tapImportSrp(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.importSrpButton, {
      description: 'Import SRP button',
    });
  }

  async tapAddSolanaAccount(): Promise<void> {
    await Gestures.waitAndTap(this.createSolanaAccountButton, {
      elemDescription: 'Add Solana Account button',
    });
  }
}

export default new AddAccountBottomSheet();
