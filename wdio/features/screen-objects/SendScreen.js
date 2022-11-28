import Gestures from "../helpers/Gestures";
import Selectors from "../helpers/Selectors";
import { 
    SEND_ADDRESS_INPUT_FIELD,
 } from '../testIDs/Screens/SendScreen.testIds';

class SendScreen{

    get sendAddressInputField (){
       return Selectors.getElementByPlatform(SEND_ADDRESS_INPUT_FIELD);
    }

    async typeAddressInSendAddressField(address){
        await Gestures.typeText(this.sendAddressInputField, address);
    }
}
export default new SendScreen();