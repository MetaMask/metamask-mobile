import { RequestPaymentViewSelectors } from '../../../app/components/UI/ReceiveRequest/RequestPaymentView.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';

class RequestPaymentView {
  get backButton(): DetoxElement {
    return Matchers.getElementByID(RequestPaymentViewSelectors.BACK_BUTTON_ID);
  }

  get tokenSearchInput(): DetoxElement {
    return Matchers.getElementByID(
      RequestPaymentViewSelectors.TOKEN_SEARCH_INPUT_BOX,
    );
  }

  get requestAmountInput(): DetoxElement {
    return Matchers.getElementByID(
      RequestPaymentViewSelectors.REQUEST_AMOUNT_INPUT_BOX_ID,
    );
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
    await Gestures.typeText(this.tokenSearchInput, token, {
      elemDescription: 'Token Search Input',
      hideKeyboard: true,
    });
  }

  async tapOnToken(token: string) {
    const tokenElement = await Matchers.getElementByText(token, 0);
    await Gestures.waitAndTap(Promise.resolve(tokenElement), {
      elemDescription: `Token "${token}" in Request Payment View`,
    });
  }

  async typeInTokenAmount(amount: number | string): Promise<void> {
    await Gestures.typeText(this.requestAmountInput, String(amount), {
      elemDescription: 'Request Amount Input',
      hideKeyboard: true,
    });
  }
}

export default new RequestPaymentView();
