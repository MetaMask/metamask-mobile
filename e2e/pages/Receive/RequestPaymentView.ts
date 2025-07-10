import { RequestPaymentViewSelectors } from '../../selectors/Receive/RequestPaymentView.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class RequestPaymentView {
  get backButton(): TappableElement {
    return Matchers.getElementByID(RequestPaymentViewSelectors.BACK_BUTTON_ID);
  }

  get tokenSearchInput(): TypableElement {
    return Matchers.getElementByID(
      RequestPaymentViewSelectors.TOKEN_SEARCH_INPUT_BOX,
    ) as TypableElement;
  }

  get requestAmountInput(): TypableElement {
    return Matchers.getElementByID(
      RequestPaymentViewSelectors.REQUEST_AMOUNT_INPUT_BOX_ID,
    ) as TypableElement;
  }

  get requestPaymentContainer(): DetoxElement {
    return Matchers.getElementByID(
      RequestPaymentViewSelectors.REQUEST_PAYMENT_CONTAINER_ID,
    );
  }

  get requestAssetList(): DetoxElement {
    return Matchers.getElementByID(
      RequestPaymentViewSelectors.REQUEST_ASSET_LIST_ID,
    );
  }

  async tapBackButton(): Promise<void> {
    await Gestures.waitAndTap(this.backButton);
  }

  async searchForToken(token: string): Promise<void> {
    await Gestures.typeTextAndHideKeyboard(this.tokenSearchInput, token);
  }

  async tapOnToken(token: string): Promise<void> {
    const tokenElement = await Matchers.getElementByText(token, 1);
    await Gestures.waitAndTap(Promise.resolve(tokenElement));
  }

  async typeInTokenAmount(amount: number | string): Promise<void> {
    await Gestures.typeTextAndHideKeyboard(this.requestAmountInput, String(amount));
  }
}

export default new RequestPaymentView(); 