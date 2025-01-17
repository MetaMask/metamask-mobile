import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class TokenSelectBottomSheet {
  async tapTokenByName(token) {
    const tokenName = await Matchers.getElementByText(token);

    await Gestures.waitAndTap(tokenName);
  }
}

export default new TokenSelectBottomSheet();
