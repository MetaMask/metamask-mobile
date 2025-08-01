import { ethers } from 'ethers';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';
import { ActivitiesViewSelectorsText } from '../../selectors/Transactions/ActivitiesView.selectors';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import TokenOverview from '../../pages/wallet/TokenOverview';
import WalletView from '../../pages/wallet/WalletView';
import { loadFixture } from '../../framework/fixtures/FixtureHelper';
import {
  CustomNetworks,
  PopularNetworksList,
} from '../../resources/networks.e2e';
import TestHelpers from '../../helpers';
import FixtureServer from '../../framework/fixtures/FixtureServer';
import { SmokeTrade } from '../../tags';
import Assertions from '../../framework/Assertions';
import StakeView from '../../pages/Stake/StakeView';
import StakeConfirmView from '../../pages/Stake/StakeConfirmView';
import SendView from '../../pages/Send/SendView';
import AmountView from '../../pages/Send/AmountView';
import FooterActions from '../../pages/Browser/Confirmations/FooterActions';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import ImportAccountView from '../../pages/importAccount/ImportAccountView';
import SuccessImportAccountView from '../../pages/importAccount/SuccessImportAccountView';
import AddAccountBottomSheet from '../../pages/wallet/AddAccountBottomSheet';
import NetworkListModal from '../../pages/Network/NetworkListModal';
import axios, { AxiosResponse } from 'axios';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal';

interface ExitRequest {
  positionTicket: string;
  timestamp: string;
  totalShares: string;
  withdrawalTimestamp: string;
  exitQueueIndex: string;
  claimedAssets: string;
  leftShares: string;
}

interface StakingAccount {
  account: string;
  lifetimeRewards: string;
  assets: string;
  exitRequests: ExitRequest[];
}

interface StakingAPIResponse {
  accounts: StakingAccount[];
}

const fixtureServer: FixtureServer = new FixtureServer();

describe(SmokeTrade('Stake from Actions'), (): void => {
  const FIRST_ROW: number = 0;
  const AMOUNT_TO_SEND: string = '.005';
  const wallet: ethers.Wallet = ethers.Wallet.createRandom();

  beforeAll(async (): Promise<void> => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder()
      .withNetworkController(PopularNetworksList.zkSync)
      .withNetworkController(CustomNetworks.Hoodi)
      .build();
    await fixtureServer.start();
    await loadFixture(fixtureServer, { fixture });
    await TestHelpers.launchApp({
      permissions: { notifications: 'YES' },
      launchArgs: { fixtureServerPort: `${fixtureServer.getServerPort()}` },
    });
    await TestHelpers.delay(5000);
    await loginToApp();
  });

  beforeEach(async (): Promise<void> => {
    jest.setTimeout(150000);
  });

  it('should be able to import stake test account with funds', async (): Promise<void> => {
    await WalletView.tapIdenticon();
    await Assertions.expectElementToBeVisible(
      AccountListBottomSheet.accountList,
    );
    await AccountListBottomSheet.tapAddAccountButton();
    await AddAccountBottomSheet.tapImportAccount();
    await Assertions.expectElementToBeVisible(ImportAccountView.container);
    await ImportAccountView.enterPrivateKey(
      process.env.MM_STAKE_TEST_ACCOUNT_PRIVATE_KEY || '',
    );
    await Assertions.expectElementToBeVisible(
      SuccessImportAccountView.container,
    );
    await SuccessImportAccountView.tapCloseButton();
    await AccountListBottomSheet.swipeToDismissAccountsModal();
    await Assertions.expectElementToBeVisible(WalletView.container);
  });

  it('should send ETH to new account', async (): Promise<void> => {
    await TabBarComponent.tapActions();
    await Assertions.expectElementToBeVisible(
      WalletActionsBottomSheet.sendButton,
    );
    await WalletActionsBottomSheet.tapSendButton();
    await SendView.inputAddress(wallet.address);
    await Assertions.expectElementToBeVisible(SendView.nextButton);
    await SendView.tapNextButton();
    await AmountView.typeInTransactionAmount(AMOUNT_TO_SEND);
    await Assertions.expectElementToBeVisible(AmountView.nextButton);
    await AmountView.tapNextButton();
    await Assertions.expectTextDisplayed(`0${AMOUNT_TO_SEND} ETH`);
    await TestHelpers.delay(2000);
    await Assertions.expectElementToBeVisible(FooterActions.confirmButton);
    await FooterActions.tapConfirmButton();
    await Assertions.expectElementToBeVisible(ActivitiesView.title);
    await Assertions.expectElementToHaveText(
      ActivitiesView.transactionStatus(FIRST_ROW),
      ActivitiesViewSelectorsText.CONFIRM_TEXT,
      { timeout: 120000 },
    );
    // Wait fot toeast to clear
    await TestHelpers.delay(8000);
    await Assertions.expectElementToBeVisible(
      TabBarComponent.tabBarWalletButton,
    );
    await TabBarComponent.tapWallet();
    // Waiting for funds to arrive
    await Assertions.checkIfTextIsNotDisplayed('$0', 60000);
  });

  it('should be able to import the new funded account', async (): Promise<void> => {
    await TabBarComponent.tapWallet();
    await Assertions.expectElementToBeVisible(WalletView.container);
    await WalletView.tapIdenticon();
    await Assertions.expectElementToBeVisible(
      AccountListBottomSheet.accountList,
    );
    await Assertions.expectElementToBeVisible(
      AccountListBottomSheet.addAccountButton,
    );
    await AccountListBottomSheet.tapAddAccountButton();
    await Assertions.expectElementToBeVisible(
      AddAccountBottomSheet.importAccountButton,
    );
    await AddAccountBottomSheet.tapImportAccount();
    await Assertions.expectElementToBeVisible(ImportAccountView.container);
    await ImportAccountView.enterPrivateKey(wallet.privateKey);
    await Assertions.expectElementToBeVisible(
      SuccessImportAccountView.container,
    );
    await Assertions.expectElementToBeVisible(
      SuccessImportAccountView.closeButton,
    );
    await SuccessImportAccountView.tapCloseButton();
    await AccountListBottomSheet.swipeToDismissAccountsModal();
  });

  it('should Stake ETH', async (): Promise<void> => {
    await Assertions.expectElementToBeVisible(
      TabBarComponent.tabBarWalletButton,
    );
    await device.disableSynchronization();
    await WalletView.tapOnEarnButton();
    await Assertions.expectElementToBeVisible(StakeView.stakeContainer);
    await StakeView.enterAmount('.002');
    await TestHelpers.delay(1000);
    await Assertions.expectElementToBeVisible(StakeView.reviewButton);
    await StakeView.tapReview();
    await Assertions.expectElementToBeVisible(StakeView.confirmButton);
    await StakeView.tapConfirm();
    await Assertions.expectElementToBeVisible(ActivitiesView.title);
    await Assertions.expectElementToBeVisible(
      ActivitiesView.stakeDepositedLabel,
    );
    await Assertions.expectElementToHaveText(
      ActivitiesView.transactionStatus(FIRST_ROW),
      ActivitiesViewSelectorsText.CONFIRM_TEXT,
      { timeout: 120000 },
    );
    await Assertions.expectElementToBeVisible(
      TabBarComponent.tabBarWalletButton,
    );
    // Wait fot toeast to clear
    await TestHelpers.delay(8000);
  });

  it('should Stake more ETH', async (): Promise<void> => {
    await TabBarComponent.tapWallet();
    await Assertions.expectElementToBeVisible(WalletView.container);
    await Assertions.expectElementToBeVisible(WalletView.stakedEthereumLabel);
    await WalletView.tapOnStakedEthereum();
    await TestHelpers.delay(1000);
    await Assertions.expectElementToBeVisible(TokenOverview.container);
    await TokenOverview.scrollOnScreen();
    await TestHelpers.delay(3000);
    await TokenOverview.tapStakeMoreButton();
    await Assertions.expectElementToBeVisible(StakeView.stakeContainer);
    await StakeView.enterAmount('.001');
    await TestHelpers.delay(1000);
    await Assertions.expectElementToBeVisible(StakeView.reviewButton);
    await StakeView.tapReview();
    await Assertions.expectElementToBeVisible(StakeView.confirmButton);
    await StakeView.tapConfirm();
    await Assertions.expectElementToBeVisible(ActivitiesView.title);
    await Assertions.expectElementToBeVisible(
      ActivitiesView.stakeDepositedLabel,
    );
    await Assertions.expectElementToHaveText(
      ActivitiesView.transactionStatus(FIRST_ROW),
      ActivitiesViewSelectorsText.CONFIRM_TEXT,
      { timeout: 120000 },
    );
    await Assertions.expectElementToBeVisible(
      TabBarComponent.tabBarWalletButton,
    );
    // Wait fot toeast to clear
    await TestHelpers.delay(8000);
  });

  it('should Unstake ETH', async (): Promise<void> => {
    await TabBarComponent.tapWallet();
    await Assertions.expectElementToBeVisible(WalletView.container);
    await WalletView.tapOnStakedEthereum();
    await TestHelpers.delay(1000);
    await Assertions.expectElementToBeVisible(TokenOverview.container);
    await TokenOverview.scrollOnScreen();
    await TestHelpers.delay(3000);
    await Assertions.expectElementToBeVisible(TokenOverview.unstakeButton);
    await device.disableSynchronization();
    await TokenOverview.tapUnstakeButton();
    await Assertions.expectElementToBeVisible(StakeView.unstakeContainer);
    await StakeView.enterAmount('.002');
    await TestHelpers.delay(1000);
    await Assertions.expectElementToBeVisible(StakeView.reviewButton);
    await StakeView.tapReview();
    await Assertions.expectElementToBeVisible(StakeView.confirmButton);
    await StakeView.tapConfirm();
    await Assertions.expectElementToBeVisible(ActivitiesView.title);
    await Assertions.expectElementToBeVisible(ActivitiesView.unstakeLabel);
    await Assertions.expectElementToHaveText(
      ActivitiesView.transactionStatus(FIRST_ROW),
      ActivitiesViewSelectorsText.CONFIRM_TEXT,
      { timeout: 120000 },
    );
    await Assertions.expectElementToBeVisible(
      TabBarComponent.tabBarWalletButton,
    );
    // Wait fot toeast to clear
    await TestHelpers.delay(8000);
  });

  it('should find the unstake banner', async (): Promise<void> => {
    await TabBarComponent.tapWallet();
    await Assertions.expectElementToBeVisible(WalletView.container);
    await WalletView.tapOnStakedEthereum();
    await TestHelpers.delay(1000);
    await TokenOverview.scrollOnScreen();
    await TestHelpers.delay(3000);
    await Assertions.expectElementToBeVisible(TokenOverview.unstakingBanner);
    await Assertions.expectElementToBeVisible(TokenOverview.closeButton);
    await TokenOverview.tapBackButton();
  });

  it('should make sure staking actions are hidden for ETH assets that are not on main', async (): Promise<void> => {
    const THIRD_ONE: number = 2;
    await TabBarComponent.tapWallet();
    await WalletView.tapNetworksButtonOnNavBar();
    await NetworkListModal.changeNetworkTo(
      PopularNetworksList.zkSync.providerConfig.nickname,
      false,
    );
    await NetworkEducationModal.tapGotItButton();
    await Assertions.expectElementToBeVisible(WalletView.earnButton);
    await Assertions.expectElementToBeVisible(WalletView.stakedEthereumLabel);
    await WalletView.tapTokenNetworkFilter();
    await WalletView.tapTokenNetworkFilterAll();

    // Scroll to top first to ensure consistent starting position
    await WalletView.scrollToBottomOfTokensList();

    // 3rd one is Linea Network
    await WalletView.scrollToToken('Ethereum');

    await WalletView.tapOnToken('Ethereum', THIRD_ONE);
    await TokenOverview.scrollOnScreen();
    await Assertions.expectElementToBeVisible(TokenOverview.stakedBalance);
    await Assertions.expectElementToBeVisible(TokenOverview.unstakingBanner);
    await Assertions.expectElementToBeVisible(TokenOverview.unstakeButton);
    await TokenOverview.tapBackButton();
    await WalletView.tapNetworksButtonOnNavBar();
    await NetworkListModal.changeNetworkTo(
      CustomNetworks.Hoodi.providerConfig.nickname,
    );
    await NetworkEducationModal.tapGotItButton();
  });

  it.skip('should Stake Claim ETH', async (): Promise<void> => {
    const address = '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3';
    const stakeAPIUrl: string = `https://staking.api.cx.metamask.io/v1/pooled-staking/stakes/560048?accounts=${address}&resetCache=true`;
    const response: AxiosResponse<StakingAPIResponse> = await axios.get(
      stakeAPIUrl,
    );

    if (response.status !== 200) {
      throw new Error('Error calling Staking API');
    }
    const account: StakingAccount = response.data.accounts[0];
    if (!account.exitRequests[0]) {
      throw new Error(`No claim entries found for account ${wallet.address}`);
    }

    await device.terminateApp();

    // const testSpecificMockFn = async (mockServer: Mockttp) => {
    //   await setupMockRequest(mockServer, {
    //     requestMethod: 'GET',
    //     url: stakeAPIUrl,
    //     response: {
    //       accounts: [
    //         {
    //           account: account.account,
    //           lifetimeRewards: account.lifetimeRewards,
    //           assets: account.lifetimeRewards,
    //           exitRequests: [
    //             {
    //               positionTicket: account.exitRequests[0].positionTicket,
    //               timestamp: '1737657204000',
    //               totalShares: account.exitRequests[0].totalShares,
    //               withdrawalTimestamp: '0',
    //               exitQueueIndex: '157',
    //               claimedAssets: '36968822284547795',
    //               leftShares: '0',
    //             },
    //           ],
    //         },
    //       ],
    //     },
    //     responseCode: 200,
    //   });
    // };

    await loginToApp();
    await WalletView.tapOnStakedEthereum();
    await TokenOverview.scrollOnScreen();
    await TestHelpers.delay(3000);
    await TokenOverview.tapClaimButton();
    await StakeConfirmView.tapConfirmButton();
    await TokenOverview.tapBackButton();
    // Wait for transaction to complete
    try {
      await Assertions.expectTextDisplayed('Transaction #3 Complete!', {
        timeout: 30000,
      });
      await TestHelpers.delay(8000);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(`Transaction complete didn't pop up: ${e}`);
    }
    await TabBarComponent.tapActivity();
    await Assertions.expectElementToBeVisible(ActivitiesView.title);
    await Assertions.expectElementToBeVisible(
      ActivitiesView.stackingClaimLabel,
    );
    await Assertions.expectElementToHaveText(
      ActivitiesView.transactionStatus(FIRST_ROW),
      ActivitiesViewSelectorsText.CONFIRM_TEXT,
      { timeout: 120000 },
    );
  });
});
