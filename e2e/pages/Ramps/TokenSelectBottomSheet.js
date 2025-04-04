import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { selectTokenSelectors } from '../../selectors/Ramps/SelectToken.selectors';

class TokenSelectBottomSheet {
  get tokenSearchInput() {
    return Matchers.getElementByID(selectTokenSelectors.TOKEN_SELECT_MODAL_SEARCH_INPUT);
  }

  async tapTokenByName(token) {
    await Gestures.typeTextAndHideKeyboard(this.tokenSearchInput, token);
    const tokenName = await Matchers.getElementByText(token, 1);
    await Gestures.waitAndTap(tokenName);
  }
}

export default new TokenSelectBottomSheet();
