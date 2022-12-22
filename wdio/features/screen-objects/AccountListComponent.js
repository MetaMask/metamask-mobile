import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import { 
    ACCOUNT_LIST_ID,
    CREATE_ACCOUNT_BUTTON_ID,
    IMPORT_ACCOUNT_BUTTON_ID
 } from '../testIDs/Components/AccountListComponent.testIds';

class AccountListComponent{

    get accountListContainer(){
        return Selectors.getElementByPlatform(ACCOUNT_LIST_ID);
    }
    get createAccountButton(){
        return Selectors.getElementByPlatform(CREATE_ACCOUNT_BUTTON_ID);
    }
    get importAccountButton(){
        return Selectors.getElementByPlatform(IMPORT_ACCOUNT_BUTTON_ID);
    }

    async tapCreateAccountButton(){
        await Gestures.waitAndTap(this.createAccountButton);
    }
    async tapImportAccountButton(){
        await Gestures.waitAndTap(this.importAccountButton);
    }

    async tapAccountByName(accountName){
        await Gestures.tapTextByXpath(accountName);
      }
    
    async isVisible(){
        await expect(this.accountListContainer).toBeDisplayed();
    }
}

export default new AccountListComponent();
