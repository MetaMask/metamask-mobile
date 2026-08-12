import {
  Assertions,
  Gestures,
  Matchers,
  PlatformDetector,
  sleep,
  type EncapsulatedElementType,
} from '../../framework';
import { selectTokenSelectors } from '../../../app/components/UI/Ramp/Aggregator/components/TokenSelectModal/SelectToken.testIds';
import { TEXTFIELDSEARCH_TEST_ID } from '../../../app/component-library/components/Form/TextFieldSearch/TextFieldSearch.constants';

const TOKEN_SEARCH_SETTLE_MS = 1000;
const TOKEN_SEARCH_IOS_XPATH = `//*[@name='${selectTokenSelectors.TOKEN_SELECT_MODAL_SEARCH_INPUT}' or @name='${TEXTFIELDSEARCH_TEST_ID}' or contains(@label,'Search by cryptocurrency') or contains(@name,'Search by cryptocurrency') or contains(@label,'Search token by name or address') or contains(@name,'Search token by name or address')]`;

class TokenSelectScreen {
  get tokenSearchInput(): EncapsulatedElementType {
    if (PlatformDetector.isIOS()) {
      return Matchers.getElementByNativeXPath(TOKEN_SEARCH_IOS_XPATH);
    }
    return Matchers.getElementByID(
      selectTokenSelectors.TOKEN_SELECT_MODAL_SEARCH_INPUT,
    );
  }

  async tapTokenByName(token: string) {
    await Assertions.expectElementToBeVisible(this.tokenSearchInput, {
      timeout: 15000,
      description: 'Token search field should be visible',
    });
    await Gestures.typeText(this.tokenSearchInput, token, {
      elemDescription: 'Token Search Input',
      hideKeyboard: true,
    });
    await sleep(TOKEN_SEARCH_SETTLE_MS);

    const tokenElement = Matchers.getElementByText(token, 1);
    await Assertions.expectElementToBeVisible(tokenElement, {
      timeout: 15000,
      description: `Token "${token}" in Token Select Screen`,
    });
    await Gestures.waitAndTap(tokenElement, {
      elemDescription: `Token "${token}" in Token Select Screen`,
      checkForDisplayed: true,
      checkEnabled: true,
      delay: 500,
    });
  }
}

export default new TokenSelectScreen();
