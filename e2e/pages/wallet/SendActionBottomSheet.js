import { SendActionViewSelectorsIDs } from '../../selectors/SendFlow/SendActionView.selectors';
import Gestures from '../../utils/Gestures';
import Matchers from '../../utils/Matchers';

class SendActionBottomSheet {
    get solanaAddressInputField() {
        return Matchers.getElementByID(SendActionViewSelectorsIDs.SOLANA_INPUT_ADDRESS_FIELD);
      }
    
      get invalidAddressError() {
        return Matchers.getElementByID(SendActionViewSelectorsIDs.INVALID_ADDRESS_ERROR);
      }
    
      get sendSOLTransactionButton() {
        return Matchers.getElementByID(SendActionViewSelectorsIDs.SEND_TRANSACTION_BUTTON);
      }

      async sendActionInputAddress(address) {
        await Gestures.replaceTextInField(this.solanaAddressInputField, address);
      }
    
      async sendActionInputAmount(amount) {
        await Gestures.replaceTextInField(this.solanaAddressInputField, amount, 1);
      }

      async tapSendSOLTransactionButton() {
        await Gestures.waitAndTap(this.sendSOLTransactionButton);
      }
}

export default new SendActionBottomSheet;