import Matchers from '../../../utils/Matchers';
import Gestures from '../../../utils/Gestures';
import { NFTImportScreenSelectorsIDs } from '../../../selectors/wallet/ImportNFTView.selectors';

class ImportNFTView {
  get container() {
    return Matchers.getElementByID(NFTImportScreenSelectorsIDs.CONTAINER);
  }

  get networkDropdown() {
    return Matchers.getElementByID(
      NFTImportScreenSelectorsIDs.ADDRESS_INPUT_BOX,
    );
  }

  get addressInput() {
    return Matchers.getElementByID(
      NFTImportScreenSelectorsIDs.ADDRESS_INPUT_BOX,
    );
  }

  get addressWarningMessage() {
    return Matchers.getElementByID(
      NFTImportScreenSelectorsIDs.ADDRESS_WARNING_MESSAGE,
    );
  }

  get identifierInput() {
    return Matchers.getElementByID(
      NFTImportScreenSelectorsIDs.IDENTIFIER_INPUT_BOX,
    );
  }

  get networkSelection() {
    return Matchers.getElementByText('Ethereum Mainnet');
  }

  async typeInNFTAddress(address) {
    await Gestures.typeTextAndHideKeyboard(this.addressInput, address);
  }

  async typeInNFTIdentifier(identifier) {
    await Gestures.typeTextAndHideKeyboard(this.identifierInput, identifier);
  }

  async pressNetworkDropdown() {
    await Gestures.waitAndTap(this.networkDropdown);
  }

  async selectNetworkByNetworkName() {
    const networkListItem = await this.networkSelection();
    await Gestures.waitAndTap(networkListItem);
  }
}

export default new ImportNFTView();
