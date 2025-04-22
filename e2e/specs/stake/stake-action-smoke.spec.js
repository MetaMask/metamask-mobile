'use strict';
import { ethers } from 'ethers';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';
import { ActivitiesViewSelectorsText } from '../../selectors/Transactions/ActivitiesView.selectors';
import FixtureBuilder from '../../fixtures/fixture-builder';
import TokenOverview from '../../pages/wallet/TokenOverview';
import WalletView from '../../pages/wallet/WalletView';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import { CustomNetworks, PopularNetworksList } from '../../resources/networks.e2e';
import TestHelpers from '../../helpers';
import FixtureServer from '../../fixtures/fixture-server';
import { getFixturesServerPort, getMockServerPort } from '../../fixtures/utils';
import { SmokeTrade } from '../../tags';
import Assertions from '../../utils/Assertions';
import StakeView from '../../pages/Stake/StakeView';
import StakeConfirmView from '../../pages/Stake/StakeConfirmView';
import SendView from '../../pages/Send/SendView';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import AmountView from '../../pages/Send/AmountView';
import TransactionConfirmationView from '../../pages/Send/TransactionConfirmView';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import ImportAccountView from '../../pages/importAccount/ImportAccountView';
import SuccessImportAccountView from '../../pages/importAccount/SuccessImportAccountView';
import AddAccountBottomSheet from '../../pages/wallet/AddAccountBottomSheet';
import NetworkListModal from '../../pages/Network/NetworkListModal';
import axios from 'axios';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal';
import { startMockServer, stopMockServer } from '../../api-mocking/mock-server';

const fixtureServer = new FixtureServer();

describe.skip(SmokeTrade('Stake from Actions'), () => {
  const FIRST_ROW = 0;
  const AMOUNT_TO_SEND = '.005';
  let mockServer;
  const wallet = ethers.Wallet.createRandom();

  beforeAll(async () => {

    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder()
      .withNetworkController(PopularNetworksList.zkSync)
      .withNetworkController(CustomNetworks.Holesky)
      .build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await TestHelpers.launchApp({
      permissions: { notifications: 'YES' },
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
    await TestHelpers.delay(5000);
    await loginToApp();
  });

  afterAll(async () => {
    if (mockServer)
    await stopMockServer(mockServer);
    await stopFixtureServer(fixtureServer);
  });

  beforeEach(async () => {
    jest.setTimeout(150000);
  });

  it('should be able to import stake test account with funds', async () => {
    await Assertions.checkIfVisible(WalletView.container);
    await WalletView.tapIdenticon();
    await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
    await AccountListBottomSheet.tapAddAccountButton();
    await AddAccountBottomSheet.tapImportAccount();
    await Assertions.checkIfVisible(ImportAccountView.container);
    await ImportAccountView.enterPrivateKey(process.env.MM_STAKE_TEST_ACCOUNT_PRIVATE_KEY);
    await Assertions.checkIfVisible(SuccessImportAccountView.container);
    await SuccessImportAccountView.tapCloseButton();
    await AccountListBottomSheet.swipeToDismissAccountsModal();
    await Assertions.checkIfVisible(WalletView.container);
  });

  it('should send ETH to new account', async () => {
    await TabBarComponent.tapActions();
    await WalletActionsBottomSheet.tapSendButton();
    await SendView.inputAddress(wallet.address);
    await SendView.tapNextButton();
    await AmountView.typeInTransactionAmount(AMOUNT_TO_SEND);
    await AmountView.tapNextButton();
    await TransactionConfirmationView.tapConfirmButton();
    await TabBarComponent.tapActivity();
    await Assertions.checkIfVisible(ActivitiesView.title);
    await Assertions.checkIfElementToHaveText(ActivitiesView.transactionStatus(FIRST_ROW), ActivitiesViewSelectorsText.CONFIRM_TEXT, 120000);
    // Wait fot toeast to clear
    await TestHelpers.delay(8000);
    await Assertions.checkIfVisible(TabBarComponent.tabBarWalletButton);
    await TabBarComponent.tapWallet();
    // Waiting for funds to arrive
    await Assertions.checkIfTextIsNotDisplayed('$0',60000);
  });

  it('should be able to import the new funded account', async () => {
    await Assertions.checkIfVisible(WalletView.container);
    await WalletView.tapIdenticon();
    await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
    await AccountListBottomSheet.tapAddAccountButton();
    await AddAccountBottomSheet.tapImportAccount();
    await Assertions.checkIfVisible(ImportAccountView.container);
    await ImportAccountView.enterPrivateKey(wallet.privateKey);
    await Assertions.checkIfVisible(SuccessImportAccountView.container);
    await SuccessImportAccountView.tapCloseButton();
    await AccountListBottomSheet.swipeToDismissAccountsModal();
    await Assertions.checkIfVisible(WalletView.container);
  });

  it('should Stake ETH', async () => {
    await Assertions.checkIfVisible(TabBarComponent.tabBarWalletButton);
    await WalletView.tapOnEarnButton();
    await Assertions.checkIfVisible(StakeView.stakeContainer);
    await StakeView.enterAmount('.002');
    await StakeView.tapReview();
    await StakeView.tapContinue();
    await StakeConfirmView.tapConfirmButton();
    await TestHelpers.delay(2000);
    await Assertions.checkIfVisible(ActivitiesView.title);
    await Assertions.checkIfVisible(ActivitiesView.stakeDepositedLabel);
    await Assertions.checkIfElementToHaveText(ActivitiesView.transactionStatus(FIRST_ROW), ActivitiesViewSelectorsText.CONFIRM_TEXT, 120000);
    // Wait fot toeast to clear
    await TestHelpers.delay(8000);
    await Assertions.checkIfVisible(TabBarComponent.tabBarWalletButton);
    await TabBarComponent.tapWallet();
  });

  it('should Stake more ETH', async () => {
    await Assertions.checkIfVisible(TabBarComponent.tabBarWalletButton);
    await TabBarComponent.tapWallet();
    await Assertions.checkIfVisible(WalletView.container);
    await WalletView.tapOnStakedEthereum();
    await TokenOverview.scrollOnScreen();
    await TestHelpers.delay(3000);
    await TokenOverview.tapStakeMoreButton();
    await Assertions.checkIfVisible(StakeView.stakeContainer);
    await StakeView.enterAmount('.001');
    await StakeView.tapReview();
    await StakeView.tapContinue();
    await StakeConfirmView.tapConfirmButton();
    await TestHelpers.delay(10000);
    await Assertions.checkIfVisible(ActivitiesView.title);
    await Assertions.checkIfVisible(ActivitiesView.stakeDepositedLabel);
    await Assertions.checkIfElementToHaveText(ActivitiesView.transactionStatus(FIRST_ROW), ActivitiesViewSelectorsText.CONFIRM_TEXT, 120000);
    await TestHelpers.delay(8000);
    await Assertions.checkIfVisible(TabBarComponent.tabBarWalletButton);
    await TabBarComponent.tapWallet();
  });

  it('should Unstake ETH', async () => {
    await Assertions.checkIfVisible(WalletView.container);
    await WalletView.tapOnStakedEthereum();
    await TokenOverview.scrollOnScreen();
    await TestHelpers.delay(3000);
    await TokenOverview.tapUnstakeButton();
    await Assertions.checkIfVisible(StakeView.unstakeContainer);
    await StakeView.enterAmount('.002');
    await StakeView.tapReview();
    await StakeView.tapContinue();
    await StakeConfirmView.tapConfirmButton();
    await TestHelpers.delay(15000);
    await Assertions.checkIfVisible(ActivitiesView.title);
    await Assertions.checkIfVisible(ActivitiesView.unstakeLabel);
    await Assertions.checkIfElementToHaveText(ActivitiesView.transactionStatus(FIRST_ROW), ActivitiesViewSelectorsText.CONFIRM_TEXT, 120000);
    // Wait fot toeast to clear
    await TestHelpers.delay(8000);
    await Assertions.checkIfVisible(TabBarComponent.tabBarWalletButton);
    await TabBarComponent.tapWallet();
    await Assertions.checkIfVisible(WalletView.container);
    await WalletView.tapOnStakedEthereum();
    await TokenOverview.scrollOnScreen();
    await TestHelpers.delay(3000);
    await Assertions.checkIfVisible(TokenOverview.unstakingBanner);
    await TokenOverview.tapBackButton();
  });

  it('should make sure staking actions are hidden for ETH assets that are not on main', async () => {
    const THIRD_ONE = 2;
    await TabBarComponent.tapWallet();
    await WalletView.tapNetworksButtonOnNavBar();
    await NetworkListModal.changeNetworkTo(PopularNetworksList.zkSync.providerConfig.nickname, false);
    await NetworkEducationModal.tapGotItButton();
    await Assertions.checkIfNotVisible(WalletView.earnButton);
    await Assertions.checkIfNotVisible(WalletView.stakedEthereumLabel);
    await WalletView.tapTokenNetworkFilter();
    await WalletView.tapTokenNetworkFilterAll();
    // 3rd one is Linea Network
    await WalletView.tapOnToken('Ethereum', THIRD_ONE);
    await TokenOverview.scrollOnScreen();
    await TestHelpers.delay(3000);
    await Assertions.checkIfNotVisible(TokenOverview.stakedBalance);
    await Assertions.checkIfNotVisible(TokenOverview.unstakingBanner);
    await Assertions.checkIfNotVisible(TokenOverview.unstakeButton);
    await TokenOverview.tapBackButton();
    await WalletView.tapNetworksButtonOnNavBar();
    await NetworkListModal.changeNetworkTo(CustomNetworks.Holesky.providerConfig.nickname);
    await NetworkEducationModal.tapGotItButton();
  });

it('should Stake Claim ETH', async () => {
  const stakeAPIUrl = `https://staking.api.cx.metamask.io/v1/pooled-staking/stakes/17000?accounts=${wallet.address}&resetCache=true`;
  const response = await axios.get(stakeAPIUrl);

  if (response.status !== 200) {
    throw new Error('Error calling Staking API');
  }
  const account =  response.data.accounts[0];
  if (!account.exitRequests[0]) {
    throw new Error(`No claim entries found for account ${wallet.address}`);
  }

  const testSpecificMock  = {
    GET: [ {
        urlEndpoint: stakeAPIUrl,
        response: {
          accounts: [
            {
              account: account.account,
              lifetimeRewards: account.lifetimeRewards,
              assets: account.lifetimeRewards,
              exitRequests: [
                {

                  positionTicket: account.exitRequests[0].positionTicket,
                  timestamp: '1737657204000',
                  totalShares: account.exitRequests[0].totalShares,
                  withdrawalTimestamp: '0',
                  exitQueueIndex: '157',
                  claimedAssets: '36968822284547795',
                  leftShares: '0'
                },
              ]
            }
          ]
        },
        responseCode: 200,
      },
    ],
  };
  await device.terminateApp();


  const mockServerPort = getMockServerPort();
  mockServer = await startMockServer(testSpecificMock, mockServerPort);

  await TestHelpers.launchApp({
    launchArgs: { fixtureServerPort: `${getFixturesServerPort()}`,  mockServerPort: `${mockServerPort}`, },
  });
  await loginToApp();
  await WalletView.tapOnStakedEthereum();
  await TokenOverview.scrollOnScreen();
  await TestHelpers.delay(3000);
  await TokenOverview.tapClaimButton();
  await StakeConfirmView.tapConfirmButton();
  await TokenOverview.tapBackButton();
  //Wait for transaction to complete
  try {
    await Assertions.checkIfTextIsDisplayed('Transaction #3 Complete!',30000);
    await TestHelpers.delay(8000);
    } catch (e) {
      // eslint-disable-next-line no-console
       console.log(`Transaction complete didn't pop up: ${e}`);
    }
  await TabBarComponent.tapActivity();
  await Assertions.checkIfVisible(ActivitiesView.title);
  await Assertions.checkIfVisible(ActivitiesView.stackingClaimLabel);
  await Assertions.checkIfElementToHaveText(ActivitiesView.transactionStatus(FIRST_ROW), ActivitiesViewSelectorsText.CONFIRM_TEXT, 120000);
  });
});
