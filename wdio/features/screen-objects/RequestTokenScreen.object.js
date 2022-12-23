// eslint-disable-next-line no-unused-vars
/* global driver */
import Selectors from '../helpers/Selectors';
import Gestures from '../helpers/Gestures';
import {REQUEST_AMOUNT_INPUT, PAYMENT_REQUEST_CLOSE_BUTTON, REQUEST_SEARCH_ASSET_INPUT
     } from '../testIDs/Screens/RecieveToken.testids';

class RequestTokenScreen {

    get requestAmount() {
        return Selectors.getElementByPlatform(REQUEST_AMOUNT_INPUT);
    }

    get requestCloseButton() {
        return Selectors.getElementByPlatform(PAYMENT_REQUEST_CLOSE_BUTTON);
    }

    get requestSearchInput() {
        return Selectors.getElementByPlatform(REQUEST_SEARCH_ASSET_INPUT);
    }

    async typeAmountInRequest(amount) {
        await Gestures.setValueWithoutTap(this.requestAmount, amount);
    }

    async isTextElementDisplayed(text) {
        await expect(Selectors.getXpathElementByText(text)).toBeDisplayed();
    }

    async isTextElementNotDisplayed(text) {
        await expect(Selectors.getXpathElementByText(text)).not.toBeDisplayed();
    }

    async closePaymentRequest() {
        await Gestures.tap(this.requestCloseButton);
    }

    async inputSearchRequestField(searchReq) {
        await Gestures.typeText(this.requestSearchInput, searchReq);
    }
}


export default new RequestTokenScreen();
