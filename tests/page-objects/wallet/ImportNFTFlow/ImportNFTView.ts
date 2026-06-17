import Matchers from '../../../framework/Matchers';
import Gestures from '../../../framework/Gestures';
import { NFTImportScreenSelectorsIDs } from '../../../../app/components/Views/AddAsset/ImportAssetView.testIds';
import { EncapsulatedElementType } from '../../../framework';

class ImportNFTView {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(NFTImportScreenSelectorsIDs.CONTAINER);
  }

  get addressInput(): EncapsulatedElementType {
    return Matchers.getElementByID(
      NFTImportScreenSelectorsIDs.ADDRESS_INPUT_BOX,
    );
  }

  get addressWarningMessage(): EncapsulatedElementType {
    return Matchers.getElementByID(
      NFTImportScreenSelectorsIDs.ADDRESS_WARNING_MESSAGE,
    );
  }

  get identifierInput(): EncapsulatedElementType {
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
