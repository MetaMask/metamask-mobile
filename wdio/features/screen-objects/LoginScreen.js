import Gestures from "../helpers/Gestures";
import Selectors from "../helpers/Selectors";
import { DELETE_MODAL_UNDERSTAND_CONTINUE_ID } from "../testIDs/Screens/LoginScreen.testIds";


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

    async isLoginScreenVisible(){
        await expect(this.loginScreen).toBeDisplayed();
    }

    async tapResetWallet(){
        await Gestures.waitAndTap(this.resetWallet);
        await driver.pause(5000);
    }

    async tapIUnderstandContinue(){
        await Gestures.waitAndTap(this.understandContinue);
    }
}

export default new LoginScreen();