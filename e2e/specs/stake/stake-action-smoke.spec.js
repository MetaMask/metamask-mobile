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
import { CustomNetworks } from '../../resources/networks.e2e';
import TestHelpers from '../../helpers';
import FixtureServer from '../../fixtures/fixture-server';
import { getFixturesServerPort } from '../../fixtures/utils';
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

let nonceCount = 0;
const fixtureServer = new FixtureServer();

describe(SmokeStake('Stake from Actions'), () => {
  const AMOUNT_TO_SEND = '.01'
  const wallet = ethers.Wallet.createRandom();
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder()
      .withNetworkController(CustomNetworks.Holesky)
      .build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await TestHelpers.launchApp({
      permissions: { notifications: 'YES' },
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
    await loginToApp();
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  beforeEach(async () => {
    jest.setTimeout(150000);
  });

  it('should send ETH to a contact from inside the wallet', async () => {
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
      60000,
    );
  });

  it('should be able to import account', async () => {
    await TabBarComponent.tapWallet();
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

  it('Stake ETH', async () => {
    await Assertions.checkIfVisible(WalletView.container);
    await WalletView.tapOnEarnButton()
    await Assertions.checkIfVisible(StakeView.stakeContainer);
    await StakeView.selectAmount('25%')
    await StakeView.tapReview()
    await StakeView.tapContinue()
    await StakeConfirmView.tapConfirmButton()
    await Assertions.checkIfVisible(ActivitiesView.title);
    await Assertions.checkIfVisible(ActivitiesView.stakeDepositedLabel);
    await waitUntilTransactionHasCompleted();
  })

  it('Stake more ETH', async () => {
    await TabBarComponent.tapWallet();
    await Assertions.checkIfVisible(WalletView.container);
    await WalletView.tapOnStakedEthereum()
    await TokenOverview.scrollOnScreen();
    await TokenOverview.tapStakeMoreButton();
    await Assertions.checkIfVisible(StakeView.stakeContainer);
    await StakeView.enterAmount('.003')
    await StakeView.tapReview()
    await StakeView.tapContinue()
    await StakeConfirmView.tapConfirmButton()
    await Assertions.checkIfVisible(ActivitiesView.title);
    await Assertions.checkIfVisible(ActivitiesView.stakeDepositedLabel);
    await waitUntilTransactionHasCompleted();
  })

  it('Unstake ETH', async () => {
    await TabBarComponent.tapWallet();
    await Assertions.checkIfVisible(WalletView.container);
    await WalletView.tapOnStakedEthereum()
    await TokenOverview.scrollOnScreen();
    await TokenOverview.tapUnstakeButton();
    await Assertions.checkIfVisible(StakeView.unstakeContainer);
    await StakeView.enterAmount('.002')
    await StakeView.tapReview()
    await StakeView.tapContinue()
    await StakeConfirmView.tapConfirmButton()
    await Assertions.checkIfVisible(ActivitiesView.title);
    await Assertions.checkIfVisible(ActivitiesView.unstakeLabel);
    await waitUntilTransactionHasCompleted();
  })
});

async function waitUntilTransactionHasCompleted() {
  await Assertions.checkIfTextIsDisplayed(`Transaction #${nonceCount++} Complete!`, 60000);
  /*
  await Assertions.checkIfElementToHaveText(
    ActivitiesView.firstTransactionStatus,
    ActivitiesViewSelectorsText.CONFIRM_TEXT
  );
  */
}
