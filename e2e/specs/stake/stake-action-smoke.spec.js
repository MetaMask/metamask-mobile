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
import { withFixtures } from '../../fixtures/fixture-helper';
import { getFixturesServerPort, getMockServerPort } from '../../fixtures/utils';
import { SmokeStake } from '../../tags';
import Assertions from '../../utils/Assertions';
import StakeView from '../../pages/Stake/StakeView';
import StakeConfirmView from '../../pages/Stake/StakeConfirmView';
import SendView from '../../pages/Send/SendView';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import AmountView from '../../pages/Send/AmountView';
import TransactionConfirmationView from '../../pages/Send/TransactionConfirmView';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet.js';
import ImportAccountView from '../../pages/importAccount/ImportAccountView';
import SuccessImportAccountView from '../../pages/importAccount/SuccessImportAccountView';
import AddAccountBottomSheet from '../../pages/wallet/AddAccountBottomSheet';
import NetworkListModal from '../../pages/Network/NetworkListModal';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal';
import axios from 'axios';
import Utilities from '../../../e2e/utils/Utilities';

import {
  startMockServer,
  stopMockServer,
} from '../../api-mocking/mock-server.js';

const fixtureServer = new FixtureServer();

describe(SmokeStake('Stake from Actions'), () => {
  const AMOUNT_TO_SEND = '.01'
  let nonceCount = 0;
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
    await TestHelpers.delay(3000);
    await loginToApp();

  });

  afterAll(async () => {
    //if (mockServer)
    //await stopMockServer(mockServer)
    await stopFixtureServer(fixtureServer);
  });

  beforeEach(async () => {
    jest.setTimeout(150000);
  });
/*
  it('should send ETH to new account', async () => {
    await TabBarComponent.tapActions();
    await WalletActionsBottomSheet.tapSendButton();
    await SendView.inputAddress(wallet.address);
    await SendView.tapNextButton();
    await AmountView.typeInTransactionAmount(AMOUNT_TO_SEND);
    await AmountView.tapNextButton();
    await TransactionConfirmationView.tapConfirmButton();
    await TabBarComponent.tapActivity();
    await Assertions.checkIfTextIsNotDisplayed(
      ActivitiesViewSelectorsText.SUBMITTED_TEXT,
      120000,
    );
    await TabBarComponent.tapWallet();
    // Waiting for funds to arrive
    await Assertions.checkIfElementNotToHaveText(
      WalletView.totalBalance,
      '$0',
    );
  });

  it('should be able to import the funded account', async () => {
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
    await Assertions.checkIfVisible(WalletView.container);
    await WalletView.tapOnEarnButton()
    await Assertions.checkIfVisible(StakeView.stakeContainer);
    await StakeView.enterAmount('.004')
    await Assertions.checkIfVisible(StakeView.reviewButton);
    await StakeView.tapReview();
    await StakeView.tapContinue()
    await StakeConfirmView.tapConfirmButton()
    await Assertions.checkIfVisible(ActivitiesView.title);
    await Assertions.checkIfVisible(ActivitiesView.stakeDepositedLabel);
    await Assertions.checkIfTextIsDisplayed(`Transaction #${nonceCount++} Complete!`, 120000);
    await TestHelpers.delay(5000);
  })

  it('should Stake more ETH', async () => {
    await TabBarComponent.tapWallet();
    await Assertions.checkIfVisible(WalletView.container);
    await WalletView.tapOnStakedEthereum()
    await TokenOverview.scrollOnScreen();
    await TestHelpers.delay(2000);
    await TokenOverview.tapStakeMoreButton();
    await Assertions.checkIfVisible(StakeView.stakeContainer);
    await StakeView.enterAmount('.003')
    await Assertions.checkIfVisible(StakeView.reviewButton);
    await StakeView.tapReview()
    await StakeView.tapContinue()
    await StakeConfirmView.tapConfirmButton()
    await Assertions.checkIfVisible(ActivitiesView.title);
    await Assertions.checkIfVisible(ActivitiesView.stakeDepositedLabel);
    await Assertions.checkIfTextIsDisplayed(`Transaction #${nonceCount++} Complete!`, 120000);
    await TestHelpers.delay(5000);
  })

  it('should Unstake ETH', async () => {
    await TabBarComponent.tapWallet();
    await Assertions.checkIfVisible(WalletView.container);
    await WalletView.tapOnStakedEthereum()
    await TokenOverview.scrollOnScreen();
    await TestHelpers.delay(2000);
    await TokenOverview.tapUnstakeButton();
    await Assertions.checkIfVisible(StakeView.unstakeContainer);
    await StakeView.enterAmount('.002')
    await Assertions.checkIfVisible(StakeView.reviewButton);
    await StakeView.tapReview()
    await StakeView.tapContinue()
    await StakeConfirmView.tapConfirmButton()
    await Assertions.checkIfVisible(ActivitiesView.title);
    await Assertions.checkIfVisible(ActivitiesView.unstakeLabel);
    await Assertions.checkIfTextIsDisplayed(`Transaction #${nonceCount++} Complete!`, 120000);
    await TestHelpers.delay(5000);
    await TabBarComponent.tapWallet();
    await Assertions.checkIfVisible(WalletView.container);
    await WalletView.tapOnStakedEthereum()
    await TokenOverview.scrollOnScreen();
    await TestHelpers.delay(2000);
    await Assertions.checkIfVisible(TokenOverview.unstakingBanner);
    await TokenOverview.tapBackButton();
  })

  it('should make sure staking actions are hidden for ETH assets that are not on main', async () => {
    await TabBarComponent.tapWallet();
    await WalletView.tapNetworksButtonOnNavBar();
    await NetworkListModal.changeNetworkTo(PopularNetworksList.zkSync.providerConfig.nickname, false);
    await NetworkEducationModal.tapGotItButton();
    await Assertions.checkIfNotVisible(WalletView.earnButton)
    await Assertions.checkIfNotVisible(WalletView.stakedEthereumLabel)
    await WalletView.tapNetworksButtonOnNavBar();
    await NetworkListModal.changeNetworkTo(CustomNetworks.Holesky.providerConfig.nickname);
    await NetworkEducationModal.tapGotItButton();
  });
*/
  it('should Stake Claim ETH', async () => {
    const stakeAPIUrl = `https://staking.api.cx.metamask.io/v1/pooled-staking/stakes/17000?accounts=0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3&resetCache=true`

   // const stakeAPIUrl = `https://staking.api.cx.metamask.io/v1/pooled-staking/stakes/17000?accounts=${wallet.address}&resetCache=true`
    const response = await axios.get(stakeAPIUrl);

    if (response.status !== 200) {
      throw new Error('Error calling Staking API');
    }
    const account =  response.data.accounts[0]
    if (account.exitRequests.lenght === 0) {
      throw new Error('No claim entries found for this account');
    }

    const stakeAPIMock  = {
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
                    timestamp: "1737657204000",
                    totalShares: account.exitRequests[0].totalShares,
                    withdrawalTimestamp: "0",
                    exitQueueIndex: "157",
                    claimedAssets: "36968822284547795",
                    leftShares: "0"
                  },
                ]
              }
            ]
          },
          responseCode: 200,
        },
      ],
    }

    console.log(JSON.stringify(stakeAPIMock))

    const mockServerPort = getMockServerPort();
    mockServer = await startMockServer(stakeAPIMock,mockServerPort);
    await TestHelpers.launchApp({
      delete: true,
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}`, mockServerPort: `${mockServerPort}`,  detoxURLBlacklistRegex: `${Utilities.BlacklistURLs}`, },
    });

    await loginToApp();
    await Assertions.checkIfVisible(WalletView.container);
    await WalletView.tapOnStakedEthereum()
    await TokenOverview.scrollOnScreen();
    await TestHelpers.delay(2000);
    await Assertions.checkIfVisible(TokenOverview.claimButton)
    /*
    await TokenOverview.tapClaimButton();
    await StakeConfirmView.tapConfirmButton();
    await TokenOverview.tapBackButton();
    await TabBarComponent.tapActivity();
    await Assertions.checkIfVisible(ActivitiesView.title);
    await Assertions.checkIfVisible(ActivitiesView.stackingClaimLabel);
    await Assertions.checkIfTextIsDisplayed(`Transaction #${nonceCount++} Complete!`, 120000);
    */
  });

  it('Test mocking', async () => {
    await stopMockServer(mockServer)
    //await stopFixtureServer(fixtureServer);

    const stakeAPIUrl = `https://staking.api.cx.metamask.io/v1/pooled-staking/stakes/17000?accounts=0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3&resetCache=true`

    const stakeAPIMock  = {
      GET: [ {
          urlEndpoint: stakeAPIUrl,
          response: {
            accounts: [
              {
                account: '0x76cf1cdd1fcc252442b50d6e97207228aa4aefc3',
                lifetimeRewards: '186658023310520',
                assets: '186658023310520',
                exitRequests: [
                  {

                    positionTicket: '2388812148025276240953',
                    timestamp: "1737657204000",
                    totalShares: '987598978301690',
                    withdrawalTimestamp: "0",
                    exitQueueIndex: "157",
                    claimedAssets: "36968822284547795",
                    leftShares: "0"
                  },
                ]
              }
            ]
          },
          responseCode: 200,
        },
      ],
    }
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withNetworkController(CustomNetworks.Holesky)
          .build(),
        restartDevice: false,
        testSpecificMock: stakeAPIMock,
      },
      async () => {
        //await loginToApp();
        await TokenOverview.tapBackButton();
        await Assertions.checkIfVisible(WalletView.container);
        await WalletView.tapOnStakedEthereum()
        await TokenOverview.scrollOnScreen();
        await TestHelpers.delay(2000);
        await Assertions.checkIfVisible(TokenOverview.claimButton)
      },
    );
  });

});

