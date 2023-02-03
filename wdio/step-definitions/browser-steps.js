/* global driver */
import { Given, Then, When } from '@wdio/cucumber-framework';
import WalletMainScreen from '../screen-objects/WalletMainScreen';
import BrowserScreen from '../screen-objects/BrowserObject/BrowserScreen';
import WalletAccountModal from '../screen-objects/Modals/WalletAccountModal';
import AddFavoriteScreen from '../screen-objects/BrowserObject/AddFavoriteScreen';
import AddressBarScreen from '../screen-objects/BrowserObject/AddressBarScreen';
import ExternalWebsitesScreen from '../screen-objects/BrowserObject/ExternalWebsitesScreen';
import OptionMenuModal from '../screen-objects/BrowserObject/OptionMenuModal';
import MultiTabScreen from '../screen-objects/BrowserObject/MultiTabScreen';
import AccountApprovalModal from '../screen-objects/Modals/AccountApprovalModal';
import AndroidNativeModals from '../screen-objects/Modals/AndroidNativeModals';
import NetworkListModal from '../screen-objects/Modals/NetworkListModal';
import NetworkEducationModal from '../screen-objects/Modals/NetworkEducationModal';
import AccountListComponent from '../screen-objects/AccountListComponent';
import TabBarModal from '../screen-objects/Modals/TabBarModal';

Given(/^I am on Home MetaMask website$/, async () => {
  await ExternalWebsitesScreen.isHomeFavoriteButtonDisplayed();
  await BrowserScreen.tapUrlBar();
  await AddressBarScreen.isUrlValueContains('https://home.metamask.io/');
  await AddressBarScreen.tapUrlCancelButton();
});

Given(/^I am on the browser view$/, async () => {
  await BrowserScreen.isScreenContentDisplayed();
});

When(/^I input "([^"]*)" in the search field$/, async (text) => {
  await BrowserScreen.tapUrlBar();
  await AddressBarScreen.editUrlInput(text);
});

When(/^I tap on "([^"]*)" on account list$/, async (text) => {
  await AccountListComponent.tapAccount(text);
});

When(/^I tap on Uniswap exchange page on the suggestion list$/, async () => {
  await AddressBarScreen.tapUniswapSuggestionButton();
});

Then(/^Uniswap exchange page is a suggestion listed$/, async () => {
  await AddressBarScreen.isUniswapSuggestionDisplayed();
});

Then(/^"([^"]*)" is the active wallet account$/, async (text) => {
  await TabBarModal.tapWalletButton();
  await WalletAccountModal.isAccountOverview();
  await WalletAccountModal.isAccountNameLabelEqualTo(text);
});

Then(/^active wallet is connected to Uniswap$/, async () => {
  await ExternalWebsitesScreen.isUniswapProfileIconDisplayed();
});

When(
  /^I tap on the account icon located in the upper right of the browser view$/,
  async () => {
    await BrowserScreen.isScreenContentDisplayed();
    await BrowserScreen.tapAccountButton();
  },
);

Then(/^select account component is displayed$/, async () => {
  await AccountListComponent.isComponentDisplayed();
});

When(/^I navigate to "([^"]*)"$/, async (text) => {
  await BrowserScreen.tapUrlBar();
  await AddressBarScreen.editUrlInput(text);
  await AddressBarScreen.submitUrlWebsite();
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
      await AddFavoriteScreen.tapAddButton();
      break;
    default:
      throw new Error('Condition not found');
  }
});

Then(/^the "([^"]*)?" is displayed in the browser tab$/, async (text) => {
  await BrowserScreen.tapUrlBar();
  await AddressBarScreen.isUrlValueContains(text);
  await AddressBarScreen.tapUrlCancelButton();
});

Then(/^the favorite is not added on the home "([^"]*)" page$/, async (text) => {
  await BrowserScreen.tapUrlBar();
  await AddressBarScreen.editUrlInput(text);
  await AddressBarScreen.tapHomeSuggestionButton();
  await ExternalWebsitesScreen.tapHomeFavoritesButton();
  await ExternalWebsitesScreen.isHomeNoFavoritesMessageDisplayed();
});

When(/^I input "([^"]*)" in the favorite name field$/, async (text) => {
  await AddFavoriteScreen.editTitleEditText(text);
});

When(/^I tap on the browser home button$/, async () => {
  await BrowserScreen.tapHomeButton();
});

When(/^I tap on Favorites on Home Website$/, async () => {
  await ExternalWebsitesScreen.tapHomeFavoritesButton();
});

Then(/^favorite card title My Uniswap is Displayed$/, async () => {
  await ExternalWebsitesScreen.isHomeFavoriteUniswapTitle();
});

Then(/^favorite card URL My Uniswap is Displayed$/, async () => {
  await ExternalWebsitesScreen.isHomeFavoriteUniswapUrl();
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

When(/^I tap the Back button on Phishing Detection page$/, async () => {
  await ExternalWebsitesScreen.tapEthereumFishingDetectionWebsiteBackButton();
});

Then(/^I should see "([^"]*)" error title$/, async (text) => {
  await ExternalWebsitesScreen.isErrorPageTitle(text);
});

Then(/^I should see "([^"]*)" error message$/, async (text) => {
  await ExternalWebsitesScreen.isErrorPageMessage(text);
});

When(/^I tap on the Return button from the error page$/, async () => {
  await ExternalWebsitesScreen.tapWrongReturnButton();
});

When(/^I tap on address bar$/, async () => {
  await BrowserScreen.tapUrlBar();
});

Then(/^browser address bar input view is displayed$/, async () => {
  await AddressBarScreen.isAddressInputViewDisplayed();
  await AddressBarScreen.tapUrlCancelButton();
});

Then(/^address field is cleared$/, async () => {
  await AddressBarScreen.isUrlInputEmpty();
});

Then(/^browser address bar input view is no longer displayed$/, async () => {
  await AddressBarScreen.isAddressInputViewNotDisplayed();
});

When(/^I input "([^"]*)" in address field$/, async (text) => {
  await AddressBarScreen.editUrlInput(text);
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
  await BrowserScreen.tapUrlBar();
  await AddressBarScreen.isUrlValueContains(text);
  await AddressBarScreen.tapUrlCancelButton();
});

Then(/^browser tab count is (\d+)$/, async (number) => {
  await driver.pause(2000);
  await BrowserScreen.numberOfTapsEqualsTo(number);
});

When(/^I input "([^"]*)" in my favorite url field$/, async (text) => {
  await AddFavoriteScreen.editUrlEditText(text);
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

When(/^I tap the "([^"]*)" option on the Option Menu$/, async (option) => {
  switch (option) {
    case 'Add to Favorites':
      await OptionMenuModal.tapAddFavoriteOption();
      break;
    case 'New Tab':
      await OptionMenuModal.tapNewTabOption();
      break;
    case 'Add Favorite':
      await OptionMenuModal.tapAddFavoriteOption();
      break;
    case 'Reload':
      await OptionMenuModal.tapReloadOption();
      break;
    case 'Switch network':
      await OptionMenuModal.tapSwitchOption();
      break;
    case 'Share':
      await OptionMenuModal.tapShareOption();
      break;
    default:
      throw new Error('Condition not found');
  }
});

Then(
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
        await OptionMenuModal.isSwitchOptionDisplayed();
        break;
      default:
        throw new Error('Condition not found');
    }
  },
);

When(/^I tap on "([^"]*)" in address field$/, async (button) => {
  switch (button) {
    case 'Cancel button':
      await AddressBarScreen.tapUrlCancelButton();
      break;
    case 'clear icon':
      await AddressBarScreen.tapClearButton();
      break;
    default:
      throw new Error('Condition not found');
  }
});

Then(/^all browser tabs are closed$/, async () => {
  await MultiTabScreen.isNoTabsMessageDisplayed();
});

Then(/^new browser tab is added$/, async () => {
  await driver.pause(2000);
  await BrowserScreen.numberOfTapsEqualsTo(2);
});

Then(/^active browser tab is refreshed$/, async () => {
  await OptionMenuModal.isModalNotDisplayed();
});

Then(
  /^device component is displayed to share current address URL$/,
  async () => {
    await AndroidNativeModals.isShareModalDisabled();
    driver.back();
  },
);

When(/^I select "([^"]*)" network option$/, async (option) => {
  switch (option) {
    case 'Goerli':
      await NetworkListModal.tapGoerliTestNetwork();
      break;
    default:
      throw new Error('Condition not found');
  }

  await NetworkEducationModal.isNetworkEducationNetworkName(option);
  await NetworkEducationModal.tapGotItButton();
});

Then(/^"([^"]*)" is selected for MMM app$/, async (option) => {
  await BrowserScreen.tapNetworkAvatarIcon();

  switch (option) {
    case 'Goerli':
      await NetworkListModal.isGoerliNetworkSelectedIconDisplayed();
      break;
    default:
      throw new Error('Condition not found');
  }

  await NetworkListModal.tapNetworkListCloseIcon();
});

Given(/^I navigate to the browser$/, async () => {
  await TabBarModal.tapBrowserButton();
  await BrowserScreen.isScreenContentDisplayed();
});

When(/^I connect my active wallet to the Uniswap exchange page$/, async () => {
  await ExternalWebsitesScreen.tapUniswapConnectButton();
  await ExternalWebsitesScreen.tapUniswapMetaMaskWalletButton();
  await AccountApprovalModal.tapConnectButton();
});

Then(/^the "([^"]*)" url is displayed in address field$/, async (text) => {
  await AddressBarScreen.isUrlValueContains(text);
});

Then(/^browser address view is displayed$/, async () => {
  await AddressBarScreen.isAddressInputViewDisplayed();
});

Then(/^I should close the address view$/, async () => {
  await AddressBarScreen.tapUrlCancelButton();
});

Then(/^the created account is selected$/, async () => {
  await AccountListComponent.isAccountTwoSelected();
  await AccountListComponent.tapAccount('Account 2');
});
When(/^I tap on the Network Icon$/, async () => {
  await BrowserScreen.tapNetworkAvatarIcon();
});
Then(/^the browser view is on the "([^"]*)" website$/, async (url) => {
  if (url === 'https://www.reddit.com/') {
    await ExternalWebsitesScreen.isRedditIconDisplayed();
  }

  await BrowserScreen.tapUrlBar();
  await AddressBarScreen.isUrlValueContains(url);
  await AddressBarScreen.tapUrlCancelButton();
});
When(/^I tap on the account icon on the Wallet screen$/, async () => {
  await WalletMainScreen.tapIdenticon();
});
