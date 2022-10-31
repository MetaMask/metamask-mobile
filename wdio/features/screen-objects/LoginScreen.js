import Gestures from "../helpers/Gestures";
import Selectors from "../helpers/Selectors";
import { 
    LOGIN_VIEW_RESET_WALLET_ID,
 } from "../testIDs/Screens/LoginScreen.testIds";

class LoginScreen{

    get loginScreen(){
        return Selectors.getElementByPlatform('login');
    }

    get resetWalletButton(){
        return Selectors.getElementByPlatform(LOGIN_VIEW_RESET_WALLET_ID);
    }

    async isLoginScreenVisible(){
        await expect(this.loginScreen).toBeDisplayed();
    }

    async tapResetWalletButton(){
        await Gestures.waitAndTap(this.resetWalletButton);
    }
}

export default new LoginScreen();