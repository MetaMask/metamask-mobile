import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class TokenSelectBottomSheet {
  async tapTokenByName(token) {
    const tokenSearchInput = await Matchers.getElementByLabel(" Search by cryptocurrency");
    await Gestures.typeTextAndHideKeyboard(tokenSearchInput, token);
    const tokenName = await Matchers.getElementByText(token, 1);
    await Gestures.waitAndTap(tokenName);
  }
}

export default new TokenSelectBottomSheet();
