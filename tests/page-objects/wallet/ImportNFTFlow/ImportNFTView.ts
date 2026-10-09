import Matchers from '../../../framework/Matchers';
import Gestures from '../../../framework/Gestures';
import { NFTImportScreenSelectorsIDs } from '../../../../app/components/Views/AddAsset/ImportAssetView.testIds';
import { type AppiumElement } from '../../../framework';

class ImportNFTView {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(NFTImportScreenSelectorsIDs.CONTAINER);
  }

  get addressInput(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      NFTImportScreenSelectorsIDs.ADDRESS_INPUT_BOX,
    );
  }

  get addressWarningMessage(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      NFTImportScreenSelectorsIDs.ADDRESS_WARNING_MESSAGE,
    );
  }

  get identifierInput(): Promise<AppiumElement> {
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
