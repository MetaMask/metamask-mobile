import { Given, Then, When } from '@wdio/cucumber-framework';
import WalletMainScreen from '../screen-objects/WalletMainScreen';
import DrawerViewScreen from '../screen-objects/DrawerViewScreen';
import BrowserScreen from '../screen-objects/BrowserObject/BrowserScreen';
import WalletAccountModal from '../screen-objects/Modals/WalletAccountModal';
import AccountListModal from '../screen-objects/Modals/AccountListModal';
import AddFavoriteScreen from '../screen-objects/BrowserObject/AddFavoriteScreen';
import AddressBarScreen from '../screen-objects/BrowserObject/AddressBarScreen';
import ExternalWebsitesScreen from '../screen-objects/BrowserObject/ExternalWebsitesScreen';
import OptionMenuModal from '../screen-objects/BrowserObject/OptionMenuModal';
import MultiTabScreen from '../screen-objects/BrowserObject/MultiTabScreen';

/* global driver */

Given(/^I am on browser view$/, async () => {
  await WalletMainScreen.tapBurgerIcon();
  await DrawerViewScreen.tapBrowserButton();
  await BrowserScreen.isScreenContentDisplayed();
});

Given(/^I am on "([^"]*)"$/, async (text) => {
  await BrowserScreen.tapUrlNavBar();
  await AddressBarScreen.editUrlInput(text);
  await AddressBarScreen.tapHomeSuggestionButton();
  await BrowserScreen.tapUrlNavBar();
  await AddressBarScreen.isUrlValueContains(text);
  await AddressBarScreen.tapUrlCancelButton();
});

When(/^I input "([^"]*)" in the search field$/, async (text) => {
  await ExternalWebsitesScreen.tapHomeSearchBar();
  await AddressBarScreen.editUrlInput(text);
});

When(/^I tap on "([^"]*)" on account list$/, async (text) => {
  await AccountListModal.tapAccount(text);
});

When(/^I tap on "([^"]*)" on the suggestion list$/, async (text) => {
  await AddressBarScreen.tapSushiSuggestionButton();
});

Then(/^"([^"]*)" is a suggestion listed$/, async (text) => {
  await AddressBarScreen.isSushiSuggestionDisplayed();
});

Then(/^the browser view is on "([^"]*)"$/, async (text) => {
  await BrowserScreen.tapUrlNavBar();
  await AddressBarScreen.isUrlValueContains(text);
  await AddressBarScreen.tapUrlCancelButton();
});

Then(/^"([^"]*)" is the active wallet account$/, async (text) => {
  await BrowserScreen.tapNavbarHamburgerButton();
  await DrawerViewScreen.tapWalletButton();
  await WalletAccountModal.isAccountNameLabelEqualTo(text);
});

Then(/^"([^"]*)" wallet is connected to Sushi Swap$/, async (text1) => {
  await WalletAccountModal.tapWalletAddress();
  const mainWallet = driver.getClipboard();
  await WalletMainScreen.tapBurgerIcon();
  await DrawerViewScreen.tapBrowserButton();
  await ExternalWebsitesScreen.tapSushiHamburgerButton();
  await ExternalWebsitesScreen.tapSushiWebStatus();
  await WalletAccountModal.isMainAddressEqualsTo(sushiWallet);
});

When(
  /^I tap on the account icon located in the upper right of the browser view$/,
  async () => {
    await DrawerViewScreen.tapBrowserButton();
    await BrowserScreen.tapAccountButton();
  },
);

Then(/^select account component is displayed$/, async () => {
  await AccountListModal.isDisplayed();
});

Then(/^"([^"]*)" is now active in the app$/, async (text) => {
  await BrowserScreen.tapNavbarHamburgerButton();
  await DrawerViewScreen.tapWalletButton();
  await WalletAccountModal.isAccountNameLabelEqualTo(text);
});

When(/^I navigate to "([^"]*)"$/, async (text) => {
  await BrowserScreen.tapUrlNavBar();
  await AddressBarScreen.editUrlInput(text);

  switch (text) {
    case 'https://curve.fi':
      await AddressBarScreen.enterUrlValue();
      break;
    case 'https://app.sushi.com/swap':
      await AddressBarScreen.tapSushiSuggestionButton();
      break;
    case 'https://brunobarbieri.eth':
      break;
    case 'http://www.empowr.com/FanFeed/Home.aspx':
      await AddressBarScreen.tapEmpowrSuggestionButton();
      await AddressBarScreen.tapUrlCancelButton();
      break;
    case 'https://quackquakc.easq':
      await AddressBarScreen.enterUrlValue();
      break;
    case 'reddit.com':
      await AddressBarScreen.tapRedditSuggestion();
      break;
    default:
      throw new Error('Condition not found');
  }
});

When(/^I connect my wallet to "([^"]*)"$/, async (text) => {
  await BrowserScreen.tapUrlNavBar();
  await AddressBarScreen.isUrlValueContains(text);
  await AddressBarScreen.tapUrlCancelButton();
  await ExternalWebsitesScreen.tapCurveConnectWalletButton();
  await ExternalWebsitesScreen.tapCurveMetaMaskAvailableWalletButton();
  await BrowserScreen.tapConfirmConnectWalletButton();
});

Given(/^I have (\d+) browser tab displayed$/, async (number) => {
  await BrowserScreen.numberOfTapsEqualsTo(number);
});

Given(/^I have no favorites saved$/, async () => {
  await ExternalWebsitesScreen.tapHomeFavoritesButton();
  await ExternalWebsitesScreen.isHomeNoFavoritesMessageDisplayed();
});

When(
  /^I tap on browser control menu icon on the bottom right of the browser view$/,
  async () => {
    await BrowserScreen.tapOptionButton();
  },
);

Then(/^"([^"]*)" view is displayed$/, async (text) => {
  switch (text) {
    case 'Add Favorites':
      await AddFavoriteScreen.isScreenDisplayed();
      break;
    default:
      throw new Error('Condition not found');
  }
});

Then(/^Name field is pre populated with "([^"]*)"$/, async (text) => {
  await AddFavoriteScreen.titleEditTextContains(text);
});

Then(/^Url field is pre populated with "([^"]*)"$/, async (text) => {
  await AddFavoriteScreen.urlEditTextContains(text);
});

When(/^I tap on "([^"]*)" on the Add Favorite Screen$/, async (text) => {
  switch (text) {
    case 'Cancel':
      await AddFavoriteScreen.tapCancelButton();
      break;
    case 'Add':
      await AddFavoriteScreen.tapAddButton();
      break;
    default:
      throw new Error('Condition not found');
  }
});

Then(/^the "([^"]*)?" is displayed in the browser tab/, async (text) => {
  switch (text) {
    case 'https://app.sushi.com/swap':
      await BrowserScreen.tapUrlNavBar();
      await AddressBarScreen.isUrlValueContains(text);
      break;
    default:
      throw new Error('Condition not found');
  }
});

Then(/^the favorite is not added on the home "([^"]*)" page$/, async (text) => {
  await BrowserScreen.tapUrlNavBar();
  await AddressBarScreen.editUrlInput(text);
  await AddressBarScreen.tapHomeSuggestionButton();
  await ExternalWebsitesScreen.tapHomeFavoritesButton();
  await ExternalWebsitesScreen.isHomeNoFavoritesMessageDisplayed();
});

When(/^I input "([^"]*)" in the favorite name field$/, async (text1) => {
  await AddFavoriteScreen.editTitleEditText();
});

When(/^I input "([^"]*)"$/, async (text) => {
  //
});

When(/^I tap on the browser home button$/, async () => {
  await BrowserScreen.tapHomeButton();
});

When(/^I tap on Favorites on Home Website$/, async () => {
  await ExternalWebsitesScreen.tapHomeFavoritesButton();
});

Then(/^favorite card title is "([^"]*)"$/, async (text) => {
  await ExternalWebsitesScreen.isHomeFavoriteSushiTitleCardDisplayed();
});

Then(/^favorite card URL is "([^"]*)"$/, async (text) => {
  await ExternalWebsitesScreen.isHomeFavoriteSushiUrlCardDisplayed();
});

Then(/^the webpage should load successfully$/, async () => {
  await ExternalWebsitesScreen.isBrunoWebsiteDisplayed();
});

Then(
  /^I should see a warning screen with Ethereum Phishing Detection title$/,
  async () => {
    await ExternalWebsitesScreen.isEthereumFishingDetectionWebsiteTitleDisplayed();
  },
);

When(/^I tap on the "([^"]*)" button$/, async (text) => {
  await ExternalWebsitesScreen.tapEthereumFishingDetectionWebsiteBackButton();
});

Then(/^I am taken back to the home page$/, async () => {
  await ExternalWebsitesScreen.isHomeWebsiteDisplayed();
});

Then(/^I should see "([^"]*)"$/, async (text) => {
  await ExternalWebsitesScreen.isWrongTitleDisplayed();
  await ExternalWebsitesScreen.isWrongSubtitle();
});

When(/^I tap on "([^"]*)"$/, async (text) => {
  await ExternalWebsitesScreen.tapWrongReturnButton();
});

When(/^I tap on address bar$/, async () => {
  await BrowserScreen.tapUrlNavBar();
});

Then(/^browser address bar input view is displayed$/, async () => {
  await AddressBarScreen.isAddressInputViewDisplayed();
});

Then(/^address field is cleared$/, async () => {
  await AddressBarScreen.isUrlInputEmpty();
});

Then(/^browser address bar input view is no longer displayed$/, async () => {
  await AddressBarScreen.isAddressInputViewNotDisplayed();
});

Then(/^the "([^"]*)" is displayed in active browser tab$/, async (text) => {
  await BrowserScreen.tapUrlNavBar();
  await AddressBarScreen.isUrlValueContains(text);
  await AddressBarScreen.tapUrlCancelButton();
});

When(/^I input "([^"]*)" in address field$/, async (text) => {
  await AddressBarScreen.editUrlInput(text);
});

When(/^I tap on device Go or Next button$/, async () => {
  await AddressBarScreen.enterUrlValue();
});

When(/^I tap on the back arrow control button$/, async () => {
  await BrowserScreen.tapBackButton();
});

When(/^I tap on forward arrow control button$/, async () => {
  await BrowserScreen.tapForwardButton();
});

When(/^I tap on search button$/, async () => {
  await BrowserScreen.tapSearchButton();
});

When(/^I tap on browser tab button with count (\d+)$/, async (number) => {
  await BrowserScreen.numberOfTapsEqualsTo(number);
  await BrowserScreen.tapTabsButton();
});

Then(/^multi browser tab view is displayed$/, async () => {
  await MultiTabScreen.isTabsViewDisplayed();
});

Then(/^new browser tab is displayed on "([^"]*)"$/, async (text) => {
  await BrowserScreen.tapUrlNavBar();
  await AddressBarScreen.isUrlValueContains(text);
  await AddressBarScreen.tapUrlCancelButton();
});

Then(/^browser tab count is (\d+)$/, async (number) => {
  await BrowserScreen.numberOfTapsEqualsTo(number);
});

When(/^I input "([^"]*)" in my favorite url field$/, async (text) => {
  await AddFavoriteScreen.editUrlEditText(text);
});

When('I tap on {string} resource card', async (s) => {
  // Write code here that turns the phrase above into concrete actions
});

Then('{string}  wallet is connected to Curve', async (s) => {
  // Write code here that turns the phrase above into concrete actions
});

When(/^I tap on "([^"]*)" button on multi browser tab view$/, async (text) => {
  switch (text) {
    case 'Close All':
      await MultiTabScreen.tapCloseAllButton();
      break;
    case 'Add':
      await MultiTabScreen.tapAddButton();
      break;
    case 'Done':
      await MultiTabScreen.tapDoneButton();
      break;
    default:
      throw new Error('Condition not found');
  }
});

Then(/^browser options menu is displayed$/, async () => {
  await OptionMenuModal.isModalDisplayed();
});

Then(
  /^([^]*) is not displayed in browser options menu$/,
  async (addfavorite) => {
    //
  },
);

When(/^I tap the "([^"]*)" option on the Option Menu$/, async (option) => {
  switch (option) {
    case 'Add to Favorites':
      await OptionMenuModal.tapAddFavoriteOption();
      break;
    default:
      throw new Error('Condition not found');
  }
});

When(
  /^"([^"]*)" option item is displayed in browser options menu$/,
  async (option) => {
    switch (option) {
      case 'New tab':
        await OptionMenuModal.isNewTabOptionDisplayed();
        break;
      case 'Add to Favorites':
        await OptionMenuModal.isAddFavoriteOptionDisplayed();
        break;
      case 'Reload':
        await OptionMenuModal.isReloadOptionDisplayed();
        break;
      case 'Share':
        await OptionMenuModal.isShareOptionDisplayed();
        break;
      case 'Open in browser':
        await OptionMenuModal.isOpenBrowserOptionDisplayed();
        break;
      case 'Switch network':
        await OptionMenuModal.isSwitchptionDisplayed();
        break;
      default:
        throw new Error('Condition not found');
    }
  },
);
Then(/^"([^"]*)" is not displayed in browser options menu$/, () => {});

When(/^I tap on "([^"]*)" in address field$/, async (button) => {
  switch (button) {
    case 'Cancel button':
      await AddressBarScreen.tapClearButton();
      break;
    case 'clear icon':
      await AddressBarScreen.tapUrlCancelButton();
      break;
    default:
      throw new Error('Condition not found');
  }
});
