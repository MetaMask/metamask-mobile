/* global driver */
import { When, Then } from '@wdio/cucumber-framework';
import WalletMainScreen from '../screen-objects/WalletMainScreen';
import AddNetworksModal from '../screen-objects/Modals/AddNetworksModal';
import NetworksScreen from '../screen-objects/NetworksScreen';
import NetworkApprovalModal from '../screen-objects/Modals/NetworkApprovalModal';
import NetworkEducationModal from '../screen-objects/Modals/NetworkEducationModal';
import NetworkListModal from '../screen-objects/Modals/NetworkListModal';

When(/^I tap on the Add a Network button/, async () => {
  await AddNetworksModal.clickAddNetworks();
});

When(/^"([^"]*)?" tab is displayed on networks screen/, async (netWorkTab) => {
  switch (netWorkTab) {
    case 'POPULAR':
      await NetworksScreen.isPopularNetworksTabVisible();
      break;
    case 'CUSTOM NETWORKS':
      await NetworksScreen.isCustomNetworksTabVisible();
      break;
    default:
      throw new Error('Tab not found');
  }
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

When(
  /^the network approval modal has button "([^"]*)?" displayed/,
  async (buttons) => {
    switch (buttons) {
      case 'Switch Network':
        await NetworkApprovalModal.isApproveNetworkButton();
        break;
      case 'Close':
        await NetworkApprovalModal.isCloseNetworkButton();
        break;
      default:
        throw new Error('Condition not found');
    }
  },
);

When(/^I tap on Switch network/, async () => {
  await NetworkApprovalModal.tapSwitchToNetwork();
  await NetworkApprovalModal.tapSwitchToNetwork();
});

When(/^I am back to the wallet view/, async () => {
  await WalletMainScreen.isVisible();
});

When(
  /^I should see the added network name "([^"]*)?" in the top navigation bar/,
  async (network) => {
    await WalletMainScreen.isNetworkNameCorrect(network);
  },
);

Then(/^I tap on the burger menu/, async () => {
  const setTimeout = 1500;
  await driver.pause(setTimeout);
  await WalletMainScreen.tapBurgerButton();
});

Then(/^I tap on "([^"]*)?" in the menu/, async (option) => {
  switch (option) {
    case 'Settings':
      await WalletMainScreen.tapSettings();
      break;
    default:
      throw new Error('Option not found');
  }
});

Then(/^In settings I tap on "([^"]*)?"/, async (option) => {
  await NetworksScreen.tapOptionInSettings(option); // Can be moved later on to more common page object folder
  const setTimeout = 2000;
  await driver.pause(setTimeout);
});

Then(
  /^"([^"]*)?" should be visible below the Custom Networks section/,
  async (network) => {
    await NetworksScreen.isNetworkVisible(network);
  },
);

Then(/^I tap on the Add Network button/, async () => {
  await NetworksScreen.tapAddNetworkButton();
});

Then(
  /^"([^"]*)?" is not visible in the Popular Networks section/,
  async (network) => {
    await NetworksScreen.isNetworkNotVisible(network);
  },
);

Then(/^I tap on the "([^"]*)?" tab/, async (netWorkTab) => {
  switch (netWorkTab) {
    case 'POPULAR':
      await NetworksScreen.tapPopularNetworksTab();
      break;
    case 'CUSTOM NETWORKS':
      await NetworksScreen.tapCustomNetworksTab();
      break;
    default:
      throw new Error('TAB name not found');
  }
});

Then(/^the Network name input box is visible/, async () => {
  await NetworksScreen.isNetworkNameVisible();
});

Then(/^I type "([^"]*)?" into Network name field/, async (data) => {
  await NetworksScreen.typeIntoNetworkName(data);
});

Then(/^the RPC URL input box is visible/, async () => {
  await NetworksScreen.isRPCUrlFieldVisible();
});

Then(/^I type "([^"]*)?" into the RPC url field/, async (data) => {
  await NetworksScreen.typeIntoRPCURLField(data);
});

Then(/^the Chain ID input box is visible/, async () => {
  await NetworksScreen.isChainIDInputVisible();
});

Then(/^I type "([^"]*)?" into the Chain ID field/, async (data) => {
  await NetworksScreen.typeIntoCHAINIDInputField(data);
});

Then(/^the Network Symbol input box is visible/, async () => {
  await NetworksScreen.isNetworkSymbolFieldVisible();
});

Then(/^I type "([^"]*)?" into the Network symbol field/, async (data) => {
  await driver.hideKeyboard();
  await NetworksScreen.typeIntoNetworkSymbol(data);
});

Then(/^the Block Explorer URL input box is visible/, async () => {
  await NetworksScreen.isBlockExplorerUrlVisible();
});

Then(/^I specify the following details:/, async () => {
  await NetworksScreen.isBlockExplorerUrlVisible();
});

Then(/^Add button is disabled/, async () => {
  await NetworksScreen.addButtonNetworkIsdisabled();
});

Then(/^I tap on the Add button/, async () => {
  await driver.hideKeyboard(); // hides keyboard so it can view elements below
  await NetworksScreen.tapAddButton();
  await NetworksScreen.tapAddButton();
  const setTimeout = 1500;
  await driver.pause(setTimeout);
});

Then(/^I tap and hold network "([^"]*)?"/, async (network) => {
  await NetworksScreen.tapAndHoldNetwork(network);
});

Then(/^I should see an alert window with the text "([^"]*)?"/, async (text) => {
  await NetworksScreen.isButtonTextVisibleByXpath(text);
});

When(/^I click "([^"]*)?" on remove network modal/, async (text) => {
  await NetworksScreen.tapRemoveNetworkButton(text);
});

Then(
  /^"([^"]*)?" should be removed from the list of RPC networks/,
  async (network) => {
    await NetworksScreen.isNetworkRemoved(network);
  },
);

Then(/^I tap on network "([^"]*)?" on networks screen/, async (network) => {
  await NetworksScreen.tapOnNetwork(network);
});

Then(/^I switch to "([^"]*)?" in the network list modal /, async (text) => {
  const setTimeout = 1500;
  await driver.pause(setTimeout);
  await NetworkListModal.changeNetwork(text);
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
      throw new Error('Button not found');
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
      throw new Error('Button not found');
  }
});

Then(/^I navigate back to the main wallet view/, async () => {
  await driver.pause(2000);
  await NetworksScreen.tapBackButtonInNewScreen();
  const setTimeout = 1500;
  await driver.pause(setTimeout);
  await NetworksScreen.tapBackButtonInNewScreen();
  await NetworksScreen.tapBackButtonInSettingsScreen();
});

Then(/^I go back to the main wallet screen/, async () => {
  await driver.pause(2500);
  await NetworksScreen.tapBackButtonInNewScreen();
  await driver.pause(2500);
  await NetworksScreen.tapBackButtonInSettingsScreen();
});

Then(/^I tap on Got it in the network education modal/, async () => {
  await NetworkEducationModal.tapGotItButton();
});

Then(/^I tap on (.*) on Networks list to switch/, async (network) => {
  await NetworkListModal.changeNetwork(network);
});

Then(/^I close the networks screen view$/, async () => {
  await NetworksScreen.tapCloseNetworkScreen();
});
