import TestHelpers from '../../helpers';
import { RegressionWalletPlatform } from '../../tags';
import ConnectBottomSheet from '../../page-objects/Browser/ConnectBottomSheet';
import NetworkApprovalBottomSheet from '../../page-objects/Network/NetworkApprovalBottomSheet';
import NetworkAddedBottomSheet from '../../page-objects/Network/NetworkAddedBottomSheet';
import Browser from '../../page-objects/Browser/BrowserView';
import NetworkView from '../../page-objects/Settings/NetworksView';
import SettingsView from '../../page-objects/Settings/SettingsView';
import LoginView from '../../page-objects/wallet/LoginView';
import TransactionConfirmationView from '../../page-objects/Send/TransactionConfirmView';
import SecurityAndPrivacy from '../../page-objects/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';
import CommonView from '../../page-objects/CommonView.ts';
import WalletView from '../../page-objects/wallet/WalletView';
import { importWalletWithRecoveryPhrase } from '../../page-objects/viewHelper.ts';
import Accounts from '../../../wdio/helpers/Accounts';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import Assertions from '../../framework/Assertions';
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

// This test was migrated to the new framework but should be reworked to use withFixtures properly
describe.skip(RegressionWalletPlatform('Deep linking Tests'), () => {
  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('should import wallet and go to the wallet view', async () => {
    await importWalletWithRecoveryPhrase({});
  });

  it('should go to the Privacy and settings view', async () => {
    await TabBarComponent.tapSettings();
    await SettingsView.tapSecurityAndPrivacy();

    await SecurityAndPrivacy.scrollToTurnOnRememberMe();
  });

  it('should enable remember me', async () => {
    await Assertions.expectToggleToBeOn(SecurityAndPrivacy.rememberMeToggle);
    await SecurityAndPrivacy.tapTurnOnRememberMeToggle();
    await Assertions.expectToggleToBeOff(SecurityAndPrivacy.rememberMeToggle);
  });

  it('should relaunch the app then enable remember me', async () => {
    // Relaunch app
    await TestHelpers.relaunchApp();
    await Assertions.expectElementToBeVisible(LoginView.container);
    await LoginView.toggleRememberMeSwitch();
    await LoginView.enterPassword(validAccount.password);
    await Assertions.expectElementToBeVisible(WalletView.container);
  });

  it('should deep link to Binance Smart Chain & show a network not found error message', async () => {
    await TestHelpers.openDeepLink(BINANCE_DEEPLINK_URL);
    await TestHelpers.delay(3000);
    await Assertions.expectTextDisplayed(networkNotFoundText);
    await Assertions.expectTextDisplayed(networkErrorBodyMessage);
    await CommonView.tapOKAlertButton();
  });

  it('should add BSC network', async () => {
    // Tap on Add Network button
    await TestHelpers.delay(3000);
    await NetworkView.tapAddNetworkButton();

    await Assertions.expectElementToBeVisible(NetworkView.networkContainer);
    await NetworkView.tapNetworkByName(
      PopularNetworksList.BNB.providerConfig.nickname,
    );

    await Assertions.expectElementToBeVisible(
      NetworkApprovalBottomSheet.container,
    );
    await Assertions.expectElementToHaveText(
      NetworkApprovalBottomSheet.displayName,
      PopularNetworksList.BNB.providerConfig.nickname,
    );
    await NetworkApprovalBottomSheet.tapApproveButton();

    await Assertions.expectElementToBeVisible(
      NetworkAddedBottomSheet.switchNetwork,
    );
    await NetworkAddedBottomSheet.tapCloseButton();
    await Assertions.expectElementToBeVisible(NetworkView.networkContainer);
  });

  it('should add polygon network', async () => {
    await NetworkView.tapNetworkByName(
      PopularNetworksList.Polygon.providerConfig.nickname,
    );

    await Assertions.expectElementToBeVisible(
      NetworkApprovalBottomSheet.container,
    );
    await Assertions.expectElementToHaveText(
      NetworkApprovalBottomSheet.displayName,
      PopularNetworksList.Polygon.providerConfig.nickname,
    );

    await NetworkApprovalBottomSheet.tapApproveButton();
    await TestHelpers.delay(1000);

    await Assertions.expectElementToBeVisible(
      NetworkAddedBottomSheet.switchNetwork,
    );
    await NetworkAddedBottomSheet.tapSwitchToNetwork();

    await Assertions.expectElementToBeVisible(WalletView.container);
    await Assertions.expectElementToHaveText(
      WalletView.navbarNetworkText,
      PopularNetworksList.Polygon.providerConfig.nickname,
    );
  });

  it('should deep link to the send flow on matic', async () => {
    await TestHelpers.openDeepLink(POLYGON_DEEPLINK_URL); //FIXME: this is failing on iOS simulator

    await TestHelpers.delay(4500);
    await Assertions.expectElementToBeVisible(
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
    await Assertions.expectElementToBeVisible(
      TransactionConfirmationView.transactionViewContainer,
    );
    //TODO: Update isNetworkNameVisible method
    //await TransactionConfirmationView.isNetworkNameVisible('BNB Smart Chain');
  });

  it('should deep link to the send flow on Goerli and submit the transaction', async () => {
    await TestHelpers.openDeepLink(GOERLI_DEEPLINK_URL);
    await TestHelpers.delay(4500);
    await Assertions.expectElementToBeVisible(
      TransactionConfirmationView.transactionViewContainer,
    );
    //TODO: Update isNetworkNameVisible method
    /*await TransactionConfirmationView.isNetworkNameVisible(
      'Goerli Test Network',
    );*/

    await Assertions.expectTextDisplayed('0.00001 GoerliETH');
    // Tap on the Send CTA
    await TransactionConfirmationView.tapConfirmButton();
    // Check that we are on the wallet screen
    await Assertions.expectElementToBeVisible(WalletView.container);
  });

  it('should deep link to the send flow on mainnet', async () => {
    await TestHelpers.openDeepLink(ETHEREUM_DEEPLINK_URL);
    await TestHelpers.delay(4500);

    await Assertions.expectElementToBeVisible(
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

    await Assertions.expectElementToBeVisible(ConnectBottomSheet.container);
    await ConnectBottomSheet.tapConnectButton();

    await Assertions.expectTextDisplayed('app.sushi.com');

    await Assertions.expectElementToBeVisible(Browser.browserScreenID);
    await Assertions.expectElementToNotBeVisible(ConnectBottomSheet.container);
  });
});
