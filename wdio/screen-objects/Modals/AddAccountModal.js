import Selectors from '../../helpers/Selectors';
import { AddAccountBottomSheetSelectorsIDs } from '../../../e2e/selectors/wallet/AddAccountBottomSheet.selectors';
import Gestures from '../../helpers/Gestures';
import AppwrightSelectors from '../../../e2e/framework/AppwrightSelectors';
import AppwrightGestures from '../../../e2e/framework/AppwrightGestures';
import { expect as appwrightExpect } from 'appwright';

class AddAccountModal {

  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;

  }

  get importSrpButton() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(AddAccountBottomSheetSelectorsIDs.IMPORT_SRP_BUTTON);
    } else {
      return AppwrightSelectors.getElementByID(this._device, AddAccountBottomSheetSelectorsIDs.IMPORT_SRP_BUTTON);
    }
  }

  get newAccountButton() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(AddAccountBottomSheetSelectorsIDs.NEW_ACCOUNT_BUTTON);
    } else {
      return AppwrightSelectors.getElementByID(this._device, AddAccountBottomSheetSelectorsIDs.NEW_ACCOUNT_BUTTON);
    }
  }

  get importAccountButton() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(AddAccountBottomSheetSelectorsIDs.IMPORT_ACCOUNT_BUTTON);
    } else {
      return AppwrightSelectors.getElementByID(this._device, AddAccountBottomSheetSelectorsIDs.IMPORT_ACCOUNT_BUTTON);
    }
  }

  get createSolanaAccountButton() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(AddAccountBottomSheetSelectorsIDs.ADD_SOLANA_ACCOUNT_BUTTON);
    } else {
      return AppwrightSelectors.getElementByID(this._device, AddAccountBottomSheetSelectorsIDs.ADD_SOLANA_ACCOUNT_BUTTON);
    }
  }

  get createEthereumAccountButton() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(AddAccountBottomSheetSelectorsIDs.ADD_ETHEREUM_ACCOUNT_BUTTON);
    } else {
      return AppwrightSelectors.getElementByID(this._device, AddAccountBottomSheetSelectorsIDs.ADD_ETHEREUM_ACCOUNT_BUTTON);
    }
  }

  async tapNewAccountButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.newAccountButton);
      const newAccountButton = await this.newAccountButton;
      await newAccountButton.waitForExist({ reverse: true });
    } else {
      await AppwrightGestures.tap(this.newAccountButton); // Use static tap method with retry logic
    }
  }

  async tapImportAccountButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.importAccountButton);
    } else {
      await AppwrightGestures.tap(this.importAccountButton); // Use static tap method with retry logic
    }
  }

  async tapImportSrpButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.importSrpButton);
    } else {
      await AppwrightGestures.tap(this.importSrpButton); // Use static tap method with retry logic
    }
  }

  async tapCreateSolanaAccountButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.createSolanaAccountButton);
    } else {
      await AppwrightGestures.tap(this.createSolanaAccountButton); // Use static tap method with retry logic
    }
  }

  async tapCreateEthereumAccountButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.createEthereumAccountButton);
    } else {
      await AppwrightGestures.tap(this.createEthereumAccountButton); // Use static tap method with retry logic
    }
  }

  async isVisible() {
    const element = await this.importSrpButton;
    await appwrightExpect(element).toBeVisible({ timeout: 10000 });
  }
}

export default new AddAccountModal();
