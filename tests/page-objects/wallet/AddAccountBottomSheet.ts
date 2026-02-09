import { AddAccountBottomSheetSelectorsIDs } from '../../../app/components/Views/AddAccountActions/AddAccountBottomSheet.testIds.ts';
import Matchers from '../../framework/Matchers.ts';
import Gestures from '../../framework/Gestures.ts';

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

  get importSrpButton(): DetoxElement {
    return Matchers.getElementByID(
      AddAccountBottomSheetSelectorsIDs.IMPORT_SRP_BUTTON,
    );
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
    await Gestures.waitAndTap(this.importSrpButton, {
      elemDescription: 'Import SRP button',
    });
  }

  async tapAddSolanaAccount(): Promise<void> {
    await Gestures.waitAndTap(this.createSolanaAccountButton, {
      elemDescription: 'Add Solana Account button',
    });
  }
}

export default new AddAccountBottomSheet();
