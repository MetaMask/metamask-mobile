import Gestures from "../helpers/Gestures";
import Selectors from "../helpers/Selectors";
import { 
    DELETE_MODAL_UNDERSTAND_CONTINUE_ID,
    DELETE_MODAL_DELETE_INPUT_ID,
    DELETE_MODAL_DELETE_MY_WALLET_PERMANENTLY,
 } from "../testIDs/Screens/LoginScreen.testIds";


class LoginScreen{

    get loginScreen(){
        return Selectors.getElementByPlatform('login');
    }

    get resetWallet(){
        return Selectors.getElementByPlatform('reset-wallet-button');
    }

    get understandContinue(){
        return Selectors.getElementByPlatform(DELETE_MODAL_UNDERSTAND_CONTINUE_ID);
    }

    get deleteInput(){
        return Selectors.getElementByPlatform(DELETE_MODAL_DELETE_INPUT_ID);
    }

    get deleteMyWallet(){
        return Selectors.getElementByPlatform(DELETE_MODAL_DELETE_MY_WALLET_PERMANENTLY);
    }

    async isLoginScreenVisible(){
        await expect(this.loginScreen).toBeDisplayed();
    }

    async tapResetWallet(){
        await Gestures.waitAndTap(this.resetWallet);
    }

    async tapIUnderstandContinue(text){
        await Gestures.waitAndTap(this.understandContinue);
    }

    async typedelete(deleteText){
        await Gestures.typeText(this.deleteInput, deleteText);
    }

    async tapDeleteMyWallet(){
        await Gestures.waitAndTap(this.deleteMyWallet);
    }
}

export default new LoginScreen();