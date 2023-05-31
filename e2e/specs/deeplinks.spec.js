'use strict';
import TestHelpers from '../helpers';
import { Regression } from '../tags';

import ConnectModal from '../pages/modals/ConnectModal';
import NetworkApprovalModal from '../pages/modals/NetworkApprovalModal';
import NetworkAddedModal from '../pages/modals/NetworkAddedModal';

import Browser from '../pages/Drawer/Browser';
import NetworkView from '../pages/Drawer/Settings/NetworksView';
import SettingsView from '../pages/Drawer/Settings/SettingsView';
import LoginView from '../pages/LoginView';
import TransactionConfirmationView from '../pages/TransactionConfirmView';

import SecurityAndPrivacy from '../pages/Drawer/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';

import WalletView from '../pages/WalletView';
import { importWalletWithRecoveryPhrase } from '../viewHelper';
import Accounts from '../../wdio/helpers/Accounts';
import TabBarComponent from '../pages/TabBarComponent';

const BINANCE_RPC_URL = 'https://bsc-dataseed1.binance.org';

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
    TestHelpers.delay(3000);
  });

  it('should enable remember me', async () => {
    await SecurityAndPrivacy.isRememberMeToggleOff();
    await SecurityAndPrivacy.tapTurnOnRememberMeToggle();
    await SecurityAndPrivacy.isRememberMeToggleOn();

    TestHelpers.delay(1500);
  });

  it('should relaunch the app then enable remember me', async () => {
    // Relaunch app
    await TestHelpers.relaunchApp();
    await LoginView.isVisible();
    await LoginView.toggleRememberMe();

    await LoginView.enterPassword(validAccount.password);
    await WalletView.isVisible();
  });

  it('should deep link to Binance Smart Chain & show a network not found error message', async () => {
    await TestHelpers.openDeepLink(BINANCE_DEEPLINK_URL);
    await TestHelpers.delay(3000);
    await TestHelpers.checkIfElementWithTextIsVisible(networkNotFoundText);
    await TestHelpers.checkIfElementWithTextIsVisible(networkErrorBodyMessage);

    await WalletView.tapOKAlertButton();
  });

  it('should go to settings then networks', async () => {
    await TabBarComponent.tapSettings();
    await SettingsView.tapNetworks();

    await NetworkView.isNetworkViewVisible();
  });

  it('should add BSC network', async () => {
    // Tap on Add Network button
    await TestHelpers.delay(3000);
    await NetworkView.tapAddNetworkButton();

    await NetworkView.isRpcViewVisible();
    await NetworkView.tapPopularNetworkByName('BNB Smart Chain');

    await NetworkApprovalModal.isVisible();
    await NetworkApprovalModal.isDisplayNameVisible('BNB Smart Chain');
    await NetworkApprovalModal.isNetworkURLVisible(BINANCE_RPC_URL);
    await NetworkApprovalModal.isChainIDVisible('56');
    await NetworkApprovalModal.tapApproveButton();

    await NetworkAddedModal.isVisible();
    await NetworkAddedModal.tapCloseButton();
    await NetworkView.isRpcViewVisible();

    //await WalletView.isVisible();
  });

  it('should add polygon network', async () => {
    await NetworkView.tapPopularNetworkByName('Polygon Mainnet');

    await NetworkApprovalModal.isVisible();
    await NetworkApprovalModal.isDisplayNameVisible('Polygon Mainnet');
    await NetworkApprovalModal.isChainIDVisible('137');

    await NetworkApprovalModal.tapApproveButton();
    await TestHelpers.delay(1000);

    await NetworkAddedModal.isVisible();
    await NetworkAddedModal.tapSwitchToNetwork();

    await WalletView.isVisible();
    await WalletView.isNetworkNameVisible('Polygon Mainnet');
  });

  it('should deep link to the send flow on matic', async () => {
    await TestHelpers.openDeepLink(POLYGON_DEEPLINK_URL); //FIXME: this is failing on iOS simulator

    await TestHelpers.delay(4500);
    await TransactionConfirmationView.isVisible();
    await TransactionConfirmationView.isNetworkNameVisible('Polygon Mainnet');
    await TestHelpers.delay(1500);
    await TransactionConfirmationView.tapCancelButton();
  });
  it('should deep link to the send flow on BSC', async () => {
    await TestHelpers.openDeepLink(BINANCE_DEEPLINK_URL);
    await TestHelpers.delay(4500);
    await TransactionConfirmationView.isVisible();
    await TransactionConfirmationView.isNetworkNameVisible('BNB Smart Chain');
  });

  it('should deep link to the send flow on Goerli and submit the transaction', async () => {
    await TestHelpers.openDeepLink(GOERLI_DEEPLINK_URL);
    await TestHelpers.delay(4500);
    await TransactionConfirmationView.isVisible();
    await TransactionConfirmationView.isNetworkNameVisible(
      'Goerli Test Network',
    );
    await TransactionConfirmationView.isTransactionTotalCorrect(
      '0.00001 GoerliETH',
    );
    // Tap on the Send CTA
    await TransactionConfirmationView.tapConfirmButton();
    // Check that we are on the wallet screen
    await WalletView.isVisible();
  });

  it('should deep link to the send flow on mainnet', async () => {
    await TestHelpers.openDeepLink(ETHEREUM_DEEPLINK_URL);
    await TestHelpers.delay(4500);

    await TransactionConfirmationView.isVisible();
    await TransactionConfirmationView.isNetworkNameVisible(
      'Ethereum Main Network',
    );
    await TransactionConfirmationView.tapCancelButton();
  });

  it('should deep link to a dapp (Sushi swap)', async () => {
    await TestHelpers.openDeepLink(DAPP_DEEPLINK_URL);
    await TestHelpers.delay(4500);

    await ConnectModal.isVisible();
    await ConnectModal.tapConnectButton();

    await TestHelpers.checkIfElementWithTextIsVisible('app.sushi.com', 0);

    await Browser.isVisible();
    await ConnectModal.isNotVisible();
  });
});
