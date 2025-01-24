'use strict';
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

const fixtureServer = new FixtureServer();

describe(SmokeStake('Stake from Actions'), () => {
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

  it('Stake ETH', async () => {
    await Assertions.checkIfVisible(WalletView.container);
    await WalletView.tapOnEarnButton()
    await Assertions.checkIfVisible(StakeView.stakeContainer);
    await StakeView.enterAmount('.05')
    await StakeView.tapReview()
    await StakeView.tapContinue()
    await StakeConfirmView.tapConfirmButton()
    await Assertions.checkIfVisible(ActivitiesView.title);
    await Assertions.checkIfVisible(ActivitiesView.stakeDepositedLabel);

    await Assertions.checkIfTextIsNotDisplayed( //this wait for text to appear
      ActivitiesViewSelectorsText.SUBMITTED_TEXT,
      60000,
    );

    await Assertions.checkIfElementToHaveText(
      ActivitiesView.firstTransactionStatus,
      ActivitiesViewSelectorsText.CONFIRM_TEXT
    );
  })

  it('Stake more ETH', async () => {
    await TabBarComponent.tapWallet();
    await Assertions.checkIfVisible(WalletView.container);
    await WalletView.tapOnStakedEthereum()
    //await TokenOverview.scrollOnScreen();
    await TokenOverview.tapStakeMoreButton();
    await Assertions.checkIfVisible(StakeView.stakeContainer);
    await StakeView.enterAmount('.03')
    await StakeView.tapReview()
    await StakeView.tapContinue()
    await StakeConfirmView.tapConfirmButton()
    await Assertions.checkIfVisible(ActivitiesView.title);
    await Assertions.checkIfVisible(ActivitiesView.stakeDepositedLabel);

    await Assertions.checkIfTextIsNotDisplayed( //this wait for text to appear
      ActivitiesViewSelectorsText.SUBMITTED_TEXT,
      60000,
    );

    await Assertions.checkIfElementToHaveText(
      ActivitiesView.firstTransactionStatus,
      ActivitiesViewSelectorsText.CONFIRM_TEXT
    );
  })

  it('Unstake ETH', async () => {
    await TabBarComponent.tapWallet();
    await Assertions.checkIfVisible(WalletView.container);
    await WalletView.tapOnStakedEthereum()
    //await TokenOverview.scrollOnScreen();
    await TokenOverview.tapUnstakeButton();
    await Assertions.checkIfVisible(StakeView.unstakeContainer);
    await StakeView.enterAmount('.06')
    await StakeView.tapReview()
    await StakeView.tapContinue()
    await StakeConfirmView.tapConfirmButton()
    await Assertions.checkIfVisible(ActivitiesView.title);
    await Assertions.checkIfVisible(ActivitiesView.unstakeLabel);

    await Assertions.checkIfTextIsNotDisplayed( //this wait for text to appear
      ActivitiesViewSelectorsText.SUBMITTED_TEXT,
      60000,
    );

    await Assertions.checkIfElementToHaveText(
      ActivitiesView.firstTransactionStatus,
      ActivitiesViewSelectorsText.CONFIRM_TEXT
    );
  })
});
