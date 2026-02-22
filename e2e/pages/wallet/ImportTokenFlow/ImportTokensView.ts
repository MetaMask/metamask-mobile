import Matchers from '../../../../tests/framework/Matchers';
import Gestures from '../../../../tests/framework/Gestures';
import {
  ImportTokenViewSelectorsIDs,
  ImportTokenViewSelectorsText,
} from '../../../../app/components/Views/AddAsset/ImportTokenView.testIds';
import { CellComponentSelectorsIDs } from '../../../../app/component-library/components/Cells/Cell/CellComponent.testIds';
import { logger } from '../../../../tests/framework';

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

  get decimalInput(): DetoxElement {
    return Matchers.getElementByID(ImportTokenViewSelectorsIDs.DECIMAL_INPUT);
  }

  get customTokenTab(): DetoxElement {
    return Matchers.getElementByText(
      ImportTokenViewSelectorsText.CUSTOM_TOKEN_TAB,
    );
  }

  get searchTokenBar(): DetoxElement {
    return Matchers.getElementByID(ImportTokenViewSelectorsIDs.SEARCH_BAR);
  }

  get networkList(): DetoxElement {
    return Matchers.getElementByID(CellComponentSelectorsIDs.SELECT, 0);
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
      clearFirst: true,
    });
  }

  async typeTokenSymbol(symbol: string): Promise<void> {
    await Gestures.typeText(this.symbolInput, symbol, {
      elemDescription: 'Token symbol input',
      hideKeyboard: true,
      clearFirst: true,
    });
  }

  async typeTokenDecimals(decimals: string): Promise<void> {
    await Gestures.typeText(this.decimalInput, decimals, {
      elemDescription: 'Token decimals input',
      hideKeyboard: true,
      clearFirst: true,
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

  async tapOnNextButton(
    screen: 'Search Token' | 'Import Token' = 'Search Token',
  ): Promise<void> {
    try {
      const buttonIndex = screen === 'Search Token' ? 0 : 1;
      await Gestures.tapAtIndex(this.nextButton, buttonIndex, {
        elemDescription: `Next button on ${screen} screen`,
        waitForElementToDisappear: true,
      });
    } catch (error) {
      logger.info(`Retrying tap on Next button on ${screen} screen`);
      // Try block could fail where only one tab is visible (i.e on Localhost network)
      await Gestures.waitAndTap(Matchers.getElementByText('Next'), {
        elemDescription: `Next button on ${screen} screen`,
        waitForElementToDisappear: true,
      });
    }
  }

  async tapOnNetworkInput(): Promise<void> {
    await Gestures.waitAndTap(this.networkInput, {
      elemDescription: 'Network input field',
    });
  }

  async swipeNetworkList(): Promise<void> {
    await Gestures.swipe(this.networkList, 'up', {
      elemDescription: 'Scroll network list',
      speed: 'fast',
      percentage: 0.7,
    });
  }

  async tapNetworkOption(networkName: string): Promise<void> {
    await Gestures.waitAndTap(Matchers.getElementByText(networkName), {
      elemDescription: `Network option: ${networkName}`,
    });
  }
}

export default new ImportTokensView();
