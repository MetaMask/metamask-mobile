import Matchers from '../../framework/Matchers';
import { selectTokenSelectors } from '../../../app/components/UI/Ramp/Aggregator/components/TokenSelectModal/SelectToken.testIds';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class TokenSelectScreen {
  get tokenSearchInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          selectTokenSelectors.TOKEN_SELECT_MODAL_SEARCH_INPUT,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          selectTokenSelectors.TOKEN_SELECT_MODAL_SEARCH_INPUT,
        ),
    });
  }

  async tapTokenByName(token: string) {
    await UnifiedGestures.typeText(this.tokenSearchInput, token, {
      elemDescription: 'Token Search Input',
      hideKeyboard: true,
    });
    const tokenName = Matchers.getElementByText(token, 1);
    await UnifiedGestures.waitAndTap(tokenName, {
      elemDescription: `Token "${token}" in Token Select Screen`,
    });
  }
}

export default new TokenSelectScreen();
