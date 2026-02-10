import Matchers from '../../../tests/framework/Matchers';
import Gestures from '../../../tests/framework/Gestures';
import { selectTokenSelectors } from '../../../app/components/UI/Ramp/Aggregator/components/TokenSelectModal/SelectToken.testIds';

class TokenSelectScreen {
  get tokenSearchInput(): DetoxElement {
    return Matchers.getElementByID(
      selectTokenSelectors.TOKEN_SELECT_MODAL_SEARCH_INPUT,
    );
  }

  async tapTokenByName(token: string) {
    await Gestures.typeText(this.tokenSearchInput, token, {
      elemDescription: 'Token Search Input',
      hideKeyboard: true,
    });
    const tokenName = Matchers.getElementByText(token, 1);
    await Gestures.waitAndTap(tokenName, {
      elemDescription: `Token "${token}" in Token Select Screen`,
    });
  }
}

export default new TokenSelectScreen();
