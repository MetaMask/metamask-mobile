import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import {
  ImportTokenViewSelectorsIDs,
  ImportTokenViewSelectorsText
} from '../../app/components/Views/AddAsset/ImportTokenView.testIds';

class AddCustomImportToken {
  get customTokenAddressField() {
    return Selectors.getElementByPlatform(ImportTokenViewSelectorsIDs.ADDRESS_INPUT);
  }

  get importButton() {
    return Selectors.getXpathElementByText(ImportTokenViewSelectorsText.IMPORT_BUTTON);
  }

  get symbolField() {
    return Selectors.getElementByPlatform(ImportTokenViewSelectorsIDs.SYMBOL_INPUT);
  }

  async typeCustomTokenAddress(text) {
    await Gestures.typeText(this.customTokenAddressField, text);
  }

  async tapImportButton() {
    await Gestures.waitAndTap(this.importButton);
  }

  async tapTokenSymbolField() {
    await Gestures.waitAndTap(this.symbolField);
  }

  async waitForImportButtonEnabled() {
    const importButton = await this.importButton;
    await importButton.waitForEnabled();
  }

  async isTokenSymbolFieldNotNull() {
    await expect(this.symbolField).not.toHaveText('GNO');
  }
}

export default new AddCustomImportToken();
