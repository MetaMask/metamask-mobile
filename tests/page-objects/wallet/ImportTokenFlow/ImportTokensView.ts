import Matchers from '../../../framework/Matchers';
import {
  ImportTokenViewSelectorsIDs,
  ImportTokenViewSelectorsText,
} from '../../../../app/components/Views/AddAsset/ImportAssetView.testIds';
import { CellComponentSelectorsIDs } from '../../../../app/component-library/components/Cells/Cell/CellComponent.testIds';
import { logger } from '../../../framework';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../../framework/UnifiedGestures';

class ImportTokensView {
  get searchTokenResult(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT,
        ),
    });
  }

  get nextButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ImportTokenViewSelectorsIDs.NEXT_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ImportTokenViewSelectorsIDs.NEXT_BUTTON,
        ),
    });
  }

  get networkInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ImportTokenViewSelectorsIDs.SELECT_NETWORK_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ImportTokenViewSelectorsIDs.SELECT_NETWORK_BUTTON,
        ),
    });
  }

  get symbolInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ImportTokenViewSelectorsIDs.SYMBOL_INPUT),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ImportTokenViewSelectorsIDs.SYMBOL_INPUT,
        ),
    });
  }

  get tokenSymbolText(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(ImportTokenViewSelectorsText.TOKEN_SYMBOL),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          ImportTokenViewSelectorsText.TOKEN_SYMBOL,
        ),
    });
  }

  get addressInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ImportTokenViewSelectorsIDs.ADDRESS_INPUT),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ImportTokenViewSelectorsIDs.ADDRESS_INPUT,
        ),
    });
  }

  get decimalInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ImportTokenViewSelectorsIDs.DECIMAL_INPUT),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ImportTokenViewSelectorsIDs.DECIMAL_INPUT,
        ),
    });
  }

  get customTokenTab(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          ImportTokenViewSelectorsText.CUSTOM_TOKEN_TAB,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          ImportTokenViewSelectorsText.CUSTOM_TOKEN_TAB,
        ),
    });
  }

  get searchTokenBar(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ImportTokenViewSelectorsIDs.SEARCH_BAR),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ImportTokenViewSelectorsIDs.SEARCH_BAR,
        ),
    });
  }

  get networkList(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(CellComponentSelectorsIDs.SELECT, 0),
      appium: () =>
        PlaywrightMatchers.getElementById(CellComponentSelectorsIDs.SELECT),
    });
  }

  async tapSymbolInput(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.symbolInput, {
      elemDescription: 'Symbol input field',
    });
  }

  async tapTokenSymbolText(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.tokenSymbolText, {
      elemDescription: 'Token symbol text',
    });
  }

  async scrollDownOnImportCustomTokens(): Promise<void> {
    await UnifiedGestures.swipe(this.symbolInput, 'up', {
      elemDescription: 'Scroll down on Import Custom Tokens',
      speed: 'fast',
      percentage: 0.6,
    });
  }

  async typeTokenAddress(address: string): Promise<void> {
    await UnifiedGestures.typeText(this.addressInput, address, {
      elemDescription: 'Token address input',
      hideKeyboard: true,
      clearFirst: true,
    });
  }

  async typeTokenSymbol(symbol: string): Promise<void> {
    await UnifiedGestures.typeText(this.symbolInput, symbol, {
      elemDescription: 'Token symbol input',
      hideKeyboard: true,
      clearFirst: true,
    });
  }

  async typeTokenDecimals(decimals: string): Promise<void> {
    await UnifiedGestures.typeText(this.decimalInput, decimals, {
      elemDescription: 'Token decimals input',
      hideKeyboard: true,
      clearFirst: true,
    });
  }

  async switchToCustomTab(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.customTokenTab, {
      elemDescription: 'Custom Token tab',
    });
  }

  async searchToken(tokenName: string): Promise<void> {
    await UnifiedGestures.typeText(this.searchTokenBar, tokenName, {
      elemDescription: 'Token search bar',
      hideKeyboard: true,
    });
  }

  async tapOnToken(): Promise<void> {
    await UnifiedGestures.tapAtIndex(this.searchTokenResult, 0, {
      elemDescription: 'Token search result',
    });
  }

  async tapOnNextButton(
    screen: 'Search Token' | 'Import Token' = 'Search Token',
  ): Promise<void> {
    try {
      const buttonIndex = screen === 'Search Token' ? 0 : 1;
      await UnifiedGestures.tapAtIndex(this.nextButton, buttonIndex, {
        elemDescription: `Next button on ${screen} screen`,
        waitForElementToDisappear: true,
      });
    } catch (error) {
      logger.info(`Retrying tap on Next button on ${screen} screen`);
      // Try block could fail where only one tab is visible (i.e on Localhost network)
      await UnifiedGestures.waitAndTap(Matchers.getElementByText('Next'), {
        elemDescription: `Next button on ${screen} screen`,
        waitForElementToDisappear: true,
      });
    }
  }

  async tapOnNetworkInput(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.networkInput, {
      elemDescription: 'Network input field',
    });
  }

  async swipeNetworkList(): Promise<void> {
    await UnifiedGestures.swipe(this.networkList, 'up', {
      elemDescription: 'Scroll network list',
      speed: 'fast',
      percentage: 0.7,
    });
  }

  async tapNetworkOption(networkName: string): Promise<void> {
    await UnifiedGestures.waitAndTap(Matchers.getElementByText(networkName), {
      elemDescription: `Network option: ${networkName}`,
    });
  }
}

export default new ImportTokensView();
