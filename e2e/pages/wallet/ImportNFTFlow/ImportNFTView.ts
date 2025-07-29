import Matchers from '../../../framework/Matchers';
import Gestures from '../../../framework/Gestures';
import { NFTImportScreenSelectorsIDs } from '../../../selectors/wallet/ImportNFTView.selectors';

class ImportNFTView {
  get container(): DetoxElement {
    return Matchers.getElementByID(NFTImportScreenSelectorsIDs.CONTAINER);
  }

  get addressInput(): DetoxElement {
    return Matchers.getElementByID(
      NFTImportScreenSelectorsIDs.ADDRESS_INPUT_BOX,
    );
  }

  get addressWarningMessage(): DetoxElement {
    return Matchers.getElementByID(
      NFTImportScreenSelectorsIDs.ADDRESS_WARNING_MESSAGE,
    );
  }

  get identifierInput(): DetoxElement {
    return Matchers.getElementByID(
      NFTImportScreenSelectorsIDs.IDENTIFIER_INPUT_BOX,
    );
  }

  async typeInNFTAddress(address: string): Promise<void> {
    await Gestures.typeText(this.addressInput, address, {
      elemDescription: 'NFT Address Input',
      hideKeyboard: true,
    });
  }

  async typeInNFTIdentifier(identifier: string): Promise<void> {
    await Gestures.typeText(this.identifierInput, identifier, {
      elemDescription: 'NFT Identifier Input',
      hideKeyboard: true,
    });
  }
}

export default new ImportNFTView();
