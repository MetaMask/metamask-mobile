'use strict';
import TestHelpers from '../../helpers';
import { Regression } from '../../tags';

import ConnectBottomSheet from '../../pages/Browser/ConnectBottomSheet';
import NetworkApprovalBottomSheet from '../../pages/Network/NetworkApprovalBottomSheet';
import NetworkAddedBottomSheet from '../../pages/Network/NetworkAddedBottomSheet';

import Browser from '../../pages/Browser/BrowserView';
import NetworkView from '../../pages/Settings/NetworksView';
import SettingsView from '../../pages/Settings/SettingsView';
import LoginView from '../../pages/wallet/LoginView';
import TransactionConfirmationView from '../../pages/Send/TransactionConfirmView';

import SecurityAndPrivacy from '../../pages/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';
import CommonView from '../../pages/CommonView';
import WalletView from '../../pages/wallet/WalletView';
import { importWalletWithRecoveryPhrase } from '../../viewHelper';
import Accounts from '../../../wdio/helpers/Accounts';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import Assertions from '../../utils/Assertions';
import { PopularNetworksList } from '../../resources/networks.e2e';

//const BINANCE_RPC_URL = 'https://bsc-dataseed1.binance.org';

const BINANCE_DEEPLINK_URL =
  'https://metamask.app.link/send/0xB8B4EE5B1b693971eB60bDa15211570df2dB228A@56?value=1e14';

const POLYGON_DEEPLINK_URL =
  'https://metamask.app.link/send/0x0000000000000000000000000000000000001010@137/transfer?address=0xC5b2b5ae370876c0122910F92a13bef85A133E56&uint256=3e18';

const ETHEREUM_DEEPLINK_URL =
  'https://metamask.app.link/send/0x1FDb169Ef12954F20A15852980e1F0C122BfC1D6@1?value=1e13';
const GOERLI_DEEPLINK_URL =
  'https://metamask.app.link/send/0x1FDb169Ef12954F20A15852980e1F0C122BfC1D6@5?value=1e13';

const DAPP_DEEPLINK_URL = 'https://metamask.app.link/dapp/app.sushi.com';

const networkNotFoundText = 'Network not found';
const networkErrorBodyMessage =
  'Network with chain id 56 not found in your wallet. Please add the network first.';

const validAccount = Accounts.getValidAccount();

describe(Regression('Deep linking Tests'), () => {
  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('should import wallet and go to the wallet view', async () => {
    await importWalletWithRecoveryPhrase();
  });

  it('should go to the Privacy and settings view', async () => {
    await TabBarComponent.tapSettings();
    await SettingsView.tapSecurityAndPrivacy();

    await SecurityAndPrivacy.scrollToTurnOnRememberMe();
    await TestHelpers.delay(3000);
  });

  it('should enable remember me', async () => {
    await Assertions.checkIfToggleIsOn(SecurityAndPrivacy.rememberMeToggle);
    await SecurityAndPrivacy.tapTurnOnRememberMeToggle();
    await Assertions.checkIfToggleIsOff(SecurityAndPrivacy.rememberMeToggle);
  });

  it('should relaunch the app then enable remember me', async () => {
    // Relaunch app
    await TestHelpers.relaunchApp();
    await Assertions.checkIfVisible(LoginView.container);
    await LoginView.toggleRememberMeSwitch();
    await LoginView.enterPassword(validAccount.password);
    await Assertions.checkIfVisible(WalletView.container);
  });

  it('should deep link to Binance Smart Chain & show a network not found error message', async () => {
    await TestHelpers.openDeepLink(BINANCE_DEEPLINK_URL);
    await TestHelpers.delay(3000);
    await TestHelpers.checkIfElementWithTextIsVisible(networkNotFoundText);
    await TestHelpers.checkIfElementWithTextIsVisible(networkErrorBodyMessage);
    await CommonView.tapOKAlertButton();
  });

  it('should go to settings then networks', async () => {
    await TabBarComponent.tapSettings();
    await SettingsView.tapNetworks();

    await Assertions.checkIfVisible(NetworkView.networkContainer);
  });

  it('should add BSC network', async () => {
    // Tap on Add Network button
    await TestHelpers.delay(3000);
    await NetworkView.tapAddNetworkButton();

    await Assertions.checkIfVisible(NetworkView.networkContainer);
    await NetworkView.tapNetworkByName(
      PopularNetworksList.BNB.providerConfig.nickname,
    );

    await Assertions.checkIfVisible(NetworkApprovalBottomSheet.container);
    await Assertions.checkIfElementToHaveText(
      NetworkApprovalBottomSheet.displayName,
      PopularNetworksList.BNB.providerConfig.nickname,
    );
    await NetworkApprovalBottomSheet.tapApproveButton();

    await Assertions.checkIfVisible(NetworkAddedBottomSheet.switchNetwork);
    await NetworkAddedBottomSheet.tapCloseButton();
    await Assertions.checkIfVisible(NetworkView.networkContainer);
  });

  it('should add polygon network', async () => {
    await NetworkView.tapNetworkByName(
      PopularNetworksList.Polygon.providerConfig.nickname,
    );

    await Assertions.checkIfVisible(NetworkApprovalBottomSheet.container);
    await Assertions.checkIfElementToHaveText(
      NetworkApprovalBottomSheet.displayName,
      PopularNetworksList.Polygon.providerConfig.nickname,
    );

    await NetworkApprovalBottomSheet.tapApproveButton();
    await TestHelpers.delay(1000);

    await Assertions.checkIfVisible(NetworkAddedBottomSheet.switchNetwork);
    await NetworkAddedBottomSheet.tapSwitchToNetwork();

    await Assertions.checkIfVisible(WalletView.container);
    await Assertions.checkIfElementToHaveText(
      WalletView.navbarNetworkText,
      PopularNetworksList.Polygon.providerConfig.nickname,
    );
  });

  it('should deep link to the send flow on matic', async () => {
    await TestHelpers.openDeepLink(POLYGON_DEEPLINK_URL); //FIXME: this is failing on iOS simulator

    await TestHelpers.delay(4500);
    await Assertions.checkIfVisible(
      TransactionConfirmationView.transactionViewContainer,
    );
    //TODO: Update isNetworkNameVisible method
    //await TransactionConfirmationView.isNetworkNameVisible('Polygon Mainnet');
    await TestHelpers.delay(1500);
    await TransactionConfirmationView.tapCancelButton();
  });
  it('should deep link to the send flow on BSC', async () => {
    await TestHelpers.openDeepLink(BINANCE_DEEPLINK_URL);
    await TestHelpers.delay(4500);
    await Assertions.checkIfVisible(
      TransactionConfirmationView.transactionViewContainer,
    );
    //TODO: Update isNetworkNameVisible method
    //await TransactionConfirmationView.isNetworkNameVisible('BNB Smart Chain');
  });

  it('should deep link to the send flow on Goerli and submit the transaction', async () => {
    await TestHelpers.openDeepLink(GOERLI_DEEPLINK_URL);
    await TestHelpers.delay(4500);
    await Assertions.checkIfVisible(
      TransactionConfirmationView.transactionViewContainer,
    );
    //TODO: Update isNetworkNameVisible method
    /*await TransactionConfirmationView.isNetworkNameVisible(
      'Goerli Test Network',
    );*/

    await Assertions.checkIfTextIsDisplayed('0.00001 GoerliETH');
    // Tap on the Send CTA
    await TransactionConfirmationView.tapConfirmButton();
    // Check that we are on the wallet screen
    await Assertions.checkIfVisible(WalletView.container);
  });

  it('should deep link to the send flow on mainnet', async () => {
    await TestHelpers.openDeepLink(ETHEREUM_DEEPLINK_URL);
    await TestHelpers.delay(4500);

    await Assertions.checkIfVisible(
      TransactionConfirmationView.transactionViewContainer,
    );
    //TODO: Update isNetworkNameVisible method
    /*await TransactionConfirmationView.isNetworkNameVisible(
      'Ethereum Main Network',
    );*/
    await TransactionConfirmationView.tapCancelButton();
  });

  it('should deep link to a dapp (Sushi swap)', async () => {
    await TestHelpers.openDeepLink(DAPP_DEEPLINK_URL);
    await TestHelpers.delay(4500);

    await Assertions.checkIfVisible(ConnectBottomSheet.container);
    await ConnectBottomSheet.tapConnectButton();

    await TestHelpers.checkIfElementWithTextIsVisible('app.sushi.com', 0);

    await Assertions.checkIfVisible(Browser.browserScreenID);
    await Assertions.checkIfNotVisible(ConnectBottomSheet.container);
  });
});
