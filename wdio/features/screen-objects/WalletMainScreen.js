/* global driver */
import Selectors from '../helpers/Selectors';
import Gestures from '../helpers/Gestures.js';
import {
  WALLET_CONTAINER_ID,
  NAVBAR_TITLE_NETWORKS_TEXT,
} from '../testIDs/Screens/WalletScreen-testIds.js';
import {
  ONBOARDING_WIZARD_STEP_1_CONTAINER_ID,
  ONBOARDING_WIZARD_STEP_1_NO_THANKS_ID,
} from '../testIDs/Components/OnboardingWizard.testIds';

import {
  WALLET_VIEW_BURGER_ICON_ID,
  HAMBURGER_MENU_BUTTON,IMPORT_NFT_BUTTON_ID,
  IMPORT_TOKEN_BUTTON_ID,WALLET_ACCOUNT_ICON, 
  MAIN_WALLET_VIEW_VIA_TOKENS_ID,
  ACCOUNT_OVERVIEW_ID,
  WALLET_ACCOUNT_NAME_LABEL_INPUT,
  WALLET_ACCOUNT_NAME_LABEL_TEXT,
} from '../testIDs/Screens/WalletView.testIds';

class WalletMainScreen {
  get wizardContainer() {
    return Selectors.getElementByPlatform(
      ONBOARDING_WIZARD_STEP_1_CONTAINER_ID,
    );
  }

  get noThanks() {
    return Selectors.getElementByPlatform(
      ONBOARDING_WIZARD_STEP_1_NO_THANKS_ID,
    );
  }

  get burgerIcon() {
    return Selectors.getElementByPlatform(WALLET_VIEW_BURGER_ICON_ID);
  }

  get ImportToken() {
    return Selectors.getElementByPlatform(IMPORT_TOKEN_BUTTON_ID);
  }

  get ImportNFT() {
    return Selectors.getElementByPlatform(IMPORT_NFT_BUTTON_ID);
  }

  get HamburgerButton() {
    return Selectors.getElementByPlatform(HAMBURGER_MENU_BUTTON);
  }
  get Identicon() {
    return Selectors.getElementByPlatform(WALLET_ACCOUNT_ICON);
  }

  get WalletScreenContainer() {
    return Selectors.getElementByPlatform(WALLET_CONTAINER_ID);
  }

  get networkNavBarWalletTitle() {
    return Selectors.getElementByPlatform(NAVBAR_TITLE_NETWORKS_TEXT);
  }

  get mainWalletView() {
    return Selectors.getElementByPlatform(MAIN_WALLET_VIEW_VIA_TOKENS_ID);
  }

  get accountNameLabelText() {
    return Selectors.getElementByPlatform(WALLET_ACCOUNT_NAME_LABEL_TEXT);
  }

  get accountNameLabelInput() {
    return Selectors.getElementByPlatform(WALLET_ACCOUNT_NAME_LABEL_INPUT);
  }

  get walletAccountOverview() {
    return Selectors.getXpathElementByResourceId(ACCOUNT_OVERVIEW_ID);
  }

  async longPressAccountNameLabel() {
    await Gestures.longPress(this.accountNameLabelText, 1000);
  }

  async editAccountNameLabel(text) {
    await Gestures.typeText(this.accountNameLabelInput, text);
  }

  async tapSettings() {
    await Gestures.tap(this.drawerSettings);
  }

  async tapSendIcon(text) {
    await Gestures.tapTextByXpath(text);
  }

  async tapNoThanks() {
    await Gestures.waitAndTap(this.noThanks);
  }

  async tapBurgerIcon() {
    await Gestures.waitAndTap(this.burgerIcon);
  }

  async tapBurgerButton() {
    await Gestures.tap(this.HamburgerButton);
  }

  async tapImportTokensButton() {
    await Gestures.waitAndTap(this.ImportToken);
  }

  async tapImportNFTButton() {
    await Gestures.swipe({ x: 100, y: 500 }, { x: 100, y: 10 });
    await Gestures.waitAndTap(this.ImportNFT);
  }

  async tapBurgerButtonByXpath() {
    await Gestures.tap(
      await Selectors.getXpathElementByContentDescription(this.HamburgerButton),
    );
  }

  async tapNFTTab() {
    await Gestures.tapTextByXpath('NFTs');
  }
  async tapIdenticon() {
    await Gestures.tap(this.Identicon);
  }

  async tapNetworkNavBar() {
    const timeOut = 3000;
    await driver.pause(timeOut);
    await Gestures.tap(this.networkNavBarWalletTitle);
    await driver.pause(timeOut);
  }

  async isVisible() {
    await expect(this.WalletScreenContainer).toBeDisplayed();
  }

  async isNetworkNameCorrect(network) {
    const textFromElement = await this.networkNavBarWalletTitle;
    const networkName = await textFromElement.getText();
    expect(networkName).toContain(network);
  }

  async isTokenTextVisible(token) {
    const tokenText = Selectors.getXpathElementByText(token);
    await expect(tokenText).toBeDisplayed();
  }

  async isOnboardingWizardVisible() {
    await expect(this.wizardContainer).toBeDisplayed();
  }

  async isMainWalletViewVisible() {
    await expect(this.mainWalletView).toBeDisplayed();
  }

  async isAccountNameLabelEditable() {
    await expect(this.accountNameLabelInput).toBeDisplayed();
  }

  async isAccountNameLabelEqualTo(expected) {
    const textFromElement = await this.accountNameLabelText;
    const accountName = await textFromElement.getText();
    await expect(accountName).toContain(expected);
  }

  async isAccountInputLabelEqualTo(expected) {
    const textFromElement = await this.accountNameLabelInput;
    const accountName = await textFromElement.getText();
    await expect(accountName).toContain(expected);
  }

  async isAccountOverview() {
    await expect(await this.walletAccountOverview).toBeDisplayed();
  }

}

export default new WalletMainScreen();
