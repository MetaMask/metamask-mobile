/* global driver */
import { Given, When, Then } from '@wdio/cucumber-framework';
import ImportFromSeedScreen from '../screen-objects/Onboarding/ImportFromSeedScreen.js';
import CreateNewWalletScreen from '../screen-objects/Onboarding/CreateNewWalletScreen.js';
import MetaMetricsScreen from '../screen-objects/Onboarding/MetaMetricsScreen.js';
import OnboardingScreen from '../screen-objects/Onboarding/OnboardingScreen.js';
import WelcomeScreen from '../screen-objects/Onboarding/OnboardingCarousel.js';
import OnboardingWizardModal from '../screen-objects/Modals/OnboardingWizardModal.js';
import Accounts from '../helpers/Accounts';
import WalletMainScreen from '../screen-objects/WalletMainScreen'
import AddNetworksModal from '../screen-objects/Modals/AddNetworksModal';
import NetworksScreen from '../screen-objects/NetworksScreen';
import NetworkApprovalModal from '../screen-objects/Modals/NetworkApprovalModal';
import NetworkSwitchModal from '../../features/screen-objects/Modals/NetworkSwitchModal'


Given(/^I import wallet using seed phrase "([^"]*)?"/, async (phrase) => {
  await driver.pause(10000);
  await WelcomeScreen.clickGetStartedButton();
  await OnboardingScreen.clickImportWalletButton();
  await MetaMetricsScreen.tapIAgreeButton();
  const validAccount = Accounts.getValidAccount()
  await ImportFromSeedScreen.typeSecretRecoveryPhrase(phrase);
  await ImportFromSeedScreen.typeNewPassword(validAccount.password);
  await ImportFromSeedScreen.typeConfirmPassword(validAccount.password);
  await ImportFromSeedScreen.clickImportButton();
});

Given(/^I tap No thanks on the onboarding welcome tutorial/, async () => {
  await OnboardingWizardModal.isVisible();
  await OnboardingWizardModal.clickBackButton();
});

Then(/^I tap on the navbar network title button/, async () => {
  await WalletMainScreen.tapNetworkNavBar();
});

When(/^I tap on the Add a Network button/, async () => {
  await AddNetworksModal.clickAddNetworks();
});

Then(/^the networks page opens with two tab views: Popular networks and Custom network/, async () => {
  await NetworksScreen.isPopularNetworksTabVisible();
  await NetworksScreen.isCustomNetworksTabVisible();
});

When(/^I am on the Popular network view/, async () => {
  await NetworksScreen.isPopularNetworksTabVisible();
});

When(/^I tap on network "([^"]*)?" to add it/, async (network) => {
  await NetworksScreen.selectNetwork(network);
});

When(/^the network approval modal should appear/, async () => {
  await NetworkApprovalModal.isApproveNetworkModal();
});

When(/^I select approve/, async () => {
  await NetworkApprovalModal.tapApproveButton();
});

When(/^the network approval modal has two options Switch network and close/, async () => {
  await NetworkApprovalModal.isApproveNetworkButton();
  await NetworkApprovalModal.isCloseNetworkButton();
});

When(/^I tap on Switch network/, async () => {
  await NetworkApprovalModal.tapSwitchToNetwork();
});

When(/^I am back to the wallet view/, async () => {
  await WalletMainScreen.isVisible();
});

When(/^I should see the added network name "([^"]*)?" in the top navigation bar/, async (network) => {
  await WalletMainScreen.isNetworkNameCorrect(network);
});

Then(/^I tap on the burger menu/, async () => {
  await WalletMainScreen.tapHamburgerMenu();
});

Then(/^I tap on "([^"]*)?" in the menu/, async (option) => {
  switch (option) {
    case 'Settings':
      await WalletMainScreen.tapSettings();
      break;
    default:
      throw new Error('Condition not found');
  }
});

Then(/^In settings I tap on "([^"]*)?"/, async (option) => {
  // eslint-disable-next-line no-undef
  await $(`//android.widget.TextView[@text='${option}']`).click();
});

Then(/^"([^"]*)?" should be visible below the Custom Networks section/, async (network) => {
  // eslint-disable-next-line no-undef
  await expect($(`//android.widget.TextView[@text='${network}']`)).toBeDisplayed();
});

Then(/^I tap on the Add Network button the networks page opens/, async () => {
  await NetworksScreen.tapAddNetworkButton();
});

Then(/^"([^"]*)?" is not visible in the Popular Networks section/, async (network) => {
  // eslint-disable-next-line no-undef
  await expect($(`//android.widget.TextView[@text='${network}']`)).not.toBeDisplayed();
});

Then(/^I tap on the "([^"]*)?" tab/, async (netWorkTab) => {
  switch (netWorkTab) {
    case 'POPULAR':
      await NetworksScreen.tapPopularNetworksTab();
      break;
    case 'CUSTOM NETWORKS':
      await NetworksScreen.tapCustomNetworksTab();
      break;
    default:
      throw new Error('Condition not found');
  }
});

Then(/^the Network name input box is visible and I type "([^"]*)?"/, async (data) => {
  await NetworksScreen.isNetworkNameVisible();
  await NetworksScreen.typeIntoNetworkName(data);
 
});

Then(/^the RPC URL input box is visible and I type "([^"]*)?"/, async (data) => {
  await NetworksScreen.isRPCUrlFieldVisible();
  await NetworksScreen.typeIntoRPCURLField(data);

});

Then(/^the Chain ID input box is visible and I type "([^"]*)?"/, async (data) => {
  await NetworksScreen.isChainIDInputVisible();
  await NetworksScreen.typeIntoCHAINIDInputField(data);
});

Then(/^the Network Symbol input box is visible and I type "([^"]*)?"/, async (data) => {
  await driver.hideKeyboard();
  await NetworksScreen.isNetworkSymbolFieldVisible();
  await NetworksScreen.typeIntoNetworkSymbol(data);
});

Then(/^the Block Explorer URL input box is visible/, async (data) => {
  await NetworksScreen.isBlockExplorerUrlVisible();
});

Then(/^I specify the following details:/, async () => {
  await NetworksScreen.isBlockExplorerUrlVisible();
});

Then(/^Add button is disabled/, async () => {
  await NetworksScreen.addButtonNetworkIsdisabled();
});

Then(/^I tap on the Add button/, async () => {
  await driver.hideKeyboard();// hides keyboard so it can view elements below
  await NetworksScreen.tapAddButton();
  await NetworksScreen.tapAddButton();
  await NetworkSwitchModal.confirmNetworkSwitch();
});

Then(/^I tap and hold network "([^"]*)?"/, async (network) => {
  await NetworksScreen.tapAndHoldNetwork(network);
});

Then(/^I should see an alert window with the text "([^"]*)?"/, async (text) => {
  // eslint-disable-next-line jest/valid-expect, no-undef
  expect(await $(`//android.widget.TextView[@text='${text}']`)).toBeDisplayed();
});

When(/^I click "([^"]*)?" on remove network modal/, async (text) => {
  // eslint-disable-next-line jest/valid-expect, no-undef
  await $(`//android.widget.TextView[@text='${text}']`).click();
});

Then(/^"([^"]*)?" should be removed from the list of RPC networks/, async (network) => {
  // eslint-disable-next-line jest/valid-expect, no-undef
  expect(await $(`//android.widget.TextView[@text='${network}']`)).not.toBeDisplayed();
});

Then(/^I tap on network "([^"]*)?" on networks screen/, async (network) => {
  // eslint-disable-next-line jest/valid-expect, no-undef
  await $(`//android.widget.TextView[@text='${network}']`).touchAction('tap');
});

Then(/^a "([^"]*)?" button should be visible/, async (buttons) => {
  switch (buttons) {
    case 'Delete':
      await NetworksScreen.isDeleteNetworkButtonVisible();
      break;
    case 'Save':
      await NetworksScreen.isSaveNetworkButtonVisible();
      break;
    default:
      throw new Error('Condition not found');
  }
});

Then(/^I tap the "([^"]*)?" button/, async (buttons) => {
  switch (buttons) {
    case 'Delete':
      await NetworksScreen.tapDeleteNetworkButton();
      break;
    case 'Save':
      await NetworksScreen.tapSaveNetworkButton();
      break;
    default:
      throw new Error('Condition not found');
  }
});