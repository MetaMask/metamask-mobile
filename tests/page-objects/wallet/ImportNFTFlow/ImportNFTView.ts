import Matchers from '../../../framework/Matchers';
import { NFTImportScreenSelectorsIDs } from '../../../../app/components/Views/AddAsset/ImportAssetView.testIds';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../../framework/UnifiedGestures';

class ImportNFTView {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(NFTImportScreenSelectorsIDs.CONTAINER),
      appium: () =>
        PlaywrightMatchers.getElementById(
          NFTImportScreenSelectorsIDs.CONTAINER,
        ),
    });
  }

  get addressInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(NFTImportScreenSelectorsIDs.ADDRESS_INPUT_BOX),
      appium: () =>
        PlaywrightMatchers.getElementById(
          NFTImportScreenSelectorsIDs.ADDRESS_INPUT_BOX,
        ),
    });
  }

  get addressWarningMessage(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          NFTImportScreenSelectorsIDs.ADDRESS_WARNING_MESSAGE,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          NFTImportScreenSelectorsIDs.ADDRESS_WARNING_MESSAGE,
        ),
    });
  }

  get identifierInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          NFTImportScreenSelectorsIDs.IDENTIFIER_INPUT_BOX,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          NFTImportScreenSelectorsIDs.IDENTIFIER_INPUT_BOX,
        ),
    });
  }

  async typeInNFTAddress(address: string): Promise<void> {
    await UnifiedGestures.typeText(this.addressInput, address, {
      elemDescription: 'NFT Address Input',
      hideKeyboard: true,
    });
  }

  async typeInNFTIdentifier(identifier: string): Promise<void> {
    await UnifiedGestures.typeText(this.identifierInput, identifier, {
      elemDescription: 'NFT Identifier Input',
      hideKeyboard: true,
    });
  }
}

export default new ImportNFTView();
