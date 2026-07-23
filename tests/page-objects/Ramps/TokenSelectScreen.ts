import {
  Gestures,
  Matchers,
  PlatformDetector,
  PlaywrightAssertions,
  PlaywrightGestures,
  PlaywrightMatchers,
  asPlaywrightElement,
  encapsulated,
  encapsulatedAction,
  sleep,
  type EncapsulatedElementType,
} from '../../framework';
import { selectTokenSelectors } from '../../../app/components/UI/Ramp/Aggregator/components/TokenSelectModal/SelectToken.testIds';
import { TEXTFIELDSEARCH_TEST_ID } from '../../../app/component-library/components/Form/TextFieldSearch/TextFieldSearch.constants';

const TOKEN_SEARCH_SETTLE_MS = 1000;
const TOKEN_SEARCH_IOS_XPATH = `//*[@name='${selectTokenSelectors.TOKEN_SELECT_MODAL_SEARCH_INPUT}' or @name='${TEXTFIELDSEARCH_TEST_ID}' or contains(@label,'Search by cryptocurrency') or contains(@name,'Search by cryptocurrency') or contains(@label,'Search token by name or address') or contains(@name,'Search token by name or address')]`;

class TokenSelectScreen {
  get tokenSearchInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          selectTokenSelectors.TOKEN_SELECT_MODAL_SEARCH_INPUT,
        ),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(
            selectTokenSelectors.TOKEN_SELECT_MODAL_SEARCH_INPUT,
            { exact: true },
          ),
        ios: () => PlaywrightMatchers.getElementByXPath(TOKEN_SEARCH_IOS_XPATH),
      },
    });
  }

  async tapTokenByName(token: string) {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.typeText(this.tokenSearchInput, token, {
          elemDescription: 'Token Search Input',
          hideKeyboard: true,
        });
        const tokenName = Matchers.getElementByText(token, 1);
        await Gestures.waitAndTap(tokenName, {
          elemDescription: `Token "${token}" in Token Select Screen`,
        });
      },
      appium: async () => {
        const searchField = await asPlaywrightElement(this.tokenSearchInput);
        await PlaywrightAssertions.expectElementToBeVisible(searchField, {
          timeout: 15000,
          description: 'Token search field should be visible',
        });
        await searchField.fill(token);
        await sleep(TOKEN_SEARCH_SETTLE_MS);
        await PlaywrightGestures.dismissKeyboardAfterTokenSearch();

        const isAndroid = await PlatformDetector.isAndroid();
        const tokenElement = isAndroid
          ? await PlaywrightMatchers.getElementByAndroidUIAutomator(
              `.text("${token}")`,
              { index: 1 },
            )
          : await PlaywrightMatchers.getElementByIOSPredicate(
              `(label == "${token}" OR name == "${token}" OR label BEGINSWITH "${token} " OR name BEGINSWITH "${token} " OR label MATCHES ".*\\\\b${token}\\\\b.*" OR name MATCHES ".*\\\\b${token}\\\\b.*") AND NOT (name CONTAINS[c] "search") AND NOT (name CONTAINS[c] "textfield")`,
            );

        await PlaywrightAssertions.expectElementToBeVisible(tokenElement, {
          timeout: 15000,
          description: `Token "${token}" in Token Select Screen`,
        });
        await PlaywrightGestures.waitAndTap(tokenElement, {
          checkForDisplayed: true,
          checkForEnabled: true,
          delay: 500,
        });
      },
    });
  }
}

export default new TokenSelectScreen();
