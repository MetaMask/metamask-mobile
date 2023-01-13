import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import {
   TOKEN_ADDRESS_INPUT_BOX_ID, TOKEN_ADDRESS_SYMBOL_ID, TOKEN_IMPORT_BUTTON_ID,
} from '../testIDs/Screens/AddCustomToken.testIds';

class AddCustomImportToken {

    get customTokenAddressField() {
        return Selectors.getElementByPlatform(TOKEN_ADDRESS_INPUT_BOX_ID);
     }
  
     get importButton() {
        return Selectors.getElementByPlatform(TOKEN_IMPORT_BUTTON_ID);
     }

     get symbolField() {
        return Selectors.getElementByPlatform(TOKEN_ADDRESS_SYMBOL_ID);
     }
  
    async typeCustomTokenAddress(text) {
        await Gestures.typeText(this.customTokenAddressField, text);
    }

    async tapImportButton() {
        await driver.pause(2000);
        await Gestures.tap(this.importButton);
        await Gestures.tap(this.importButton);
    }

    async tapTokenSymbolField(){
        await Gestures.tap(this.symbolField);
    }

    async tapTokenSymbolFieldAndDismissKeyboard(){
        await this.tapTokenSymbolField();
        await driver.pause(2000);
        await driver.hideKeyboard();
    }
}
export default new AddCustomImportToken();
