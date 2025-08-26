import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { selectTokenSelectors } from '../../selectors/Ramps/SelectToken.selectors';

class TokenSelectBottomSheet {
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
      elemDescription: `Token "${token}" in Token Select Bottom Sheet`,
    });
  }
}

export default new TokenSelectBottomSheet();
