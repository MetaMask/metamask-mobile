import Matchers from '../../../framework/Matchers';
import Gestures from '../../../framework/Gestures';
import {
  ImportTokenViewSelectorsIDs,
  ImportTokenViewSelectorsText,
} from '../../../selectors/wallet/ImportTokenView.selectors';

class ImportTokensView {
  get searchTokenResult(): DetoxElement {
    return Matchers.getElementByID(
      ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT,
    );
  }

  get nextButton(): DetoxElement {
    return Matchers.getElementByID(ImportTokenViewSelectorsIDs.NEXT_BUTTON);
  }

  get networkInput(): DetoxElement {
    return Matchers.getElementByID(
      ImportTokenViewSelectorsIDs.SELECT_NETWORK_BUTTON,
    );
  }

  get symbolInput(): DetoxElement {
    return Matchers.getElementByID(ImportTokenViewSelectorsIDs.SYMBOL_INPUT);
  }

  get tokenSymbolText(): DetoxElement {
    return Matchers.getElementByText(ImportTokenViewSelectorsText.TOKEN_SYMBOL);
  }

  get addressInput(): DetoxElement {
    return Matchers.getElementByID(ImportTokenViewSelectorsIDs.ADDRESS_INPUT);
  }

  get customTokenTab(): DetoxElement {
    return Matchers.getElementByText(
      ImportTokenViewSelectorsText.CUSTOM_TOKEN_TAB,
    );
  }

  get searchTokenBar(): DetoxElement {
    return Matchers.getElementByID(ImportTokenViewSelectorsIDs.SEARCH_BAR);
  }

  async tapSymbolInput(): Promise<void> {
    await Gestures.waitAndTap(this.symbolInput, {
      elemDescription: 'Symbol input field',
    });
  }

  async tapTokenSymbolText(): Promise<void> {
    await Gestures.waitAndTap(this.tokenSymbolText, {
      elemDescription: 'Token symbol text',
    });
  }

  async scrollDownOnImportCustomTokens(): Promise<void> {
    await Gestures.swipe(this.symbolInput, 'up', {
      elemDescription: 'Scroll down on Import Custom Tokens',
      speed: 'fast',
      percentage: 0.6,
    });
  }

  async typeTokenAddress(address: string): Promise<void> {
    await Gestures.typeText(this.addressInput, address, {
      elemDescription: 'Token address input',
      hideKeyboard: true,
    });
  }

  async switchToCustomTab(): Promise<void> {
    await Gestures.waitAndTap(this.customTokenTab, {
      elemDescription: 'Custom Token tab',
    });
  }

  async searchToken(tokenName: string): Promise<void> {
    await Gestures.typeText(this.searchTokenBar, tokenName, {
      elemDescription: 'Token search bar',
      hideKeyboard: true,
    });
  }

  async tapOnToken(): Promise<void> {
    await Gestures.tapAtIndex(this.searchTokenResult, 0, {
      elemDescription: 'Token search result',
    });
  }

  async tapOnNextButton(): Promise<void> {
    await Gestures.waitAndTap(this.nextButton, {
      elemDescription: 'Next button',
    });
  }

  async tapOnNetworkInput(): Promise<void> {
    await Gestures.waitAndTap(this.networkInput, {
      elemDescription: 'Network input field',
    });
  }

  async tapNetworkOption(networkName: string): Promise<void> {
    await Gestures.waitAndTap(Matchers.getElementByText(networkName), {
      elemDescription: `Network option: ${networkName}`,
    });
  }
}

export default new ImportTokensView();
