'use strict';

import { Regression } from '../../tags';
import TestHelpers from '../../helpers';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import { loginToApp } from '../../viewHelper';
import WalletView from '../../pages/wallet/WalletView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import Assertions from '../../utils/Assertions';

const EXPECTED_HIDDEN_BALANCE: string = '••••••••••••';

describe(Regression('Balance Privacy Toggle'), (): void => {
  beforeAll(async (): Promise<void> => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('should toggle balance visibility when balance container is tapped', async (): Promise<void> => {

    await withFixtures(
      {
        fixture: new FixtureBuilder().withGanacheNetwork()
          .withETHAsPrimaryCurrency() // Set primary currency to ETH
          .build(),
        restartDevice: true,
      },
      async (): Promise<void> => {

        await loginToApp();
        await Assertions.checkIfVisible(WalletView.container);
        await Assertions.checkIfVisible(WalletView.totalBalance);
        const actualBalance: string = await WalletView.getBalanceText();
        if (!actualBalance.includes('ETH')) {
          throw new Error(`Expected balance to contain 'ETH', but got: ${actualBalance}`);
        }
        if (actualBalance.includes('••••')) {
          throw new Error(`Expected balance to not be hidden, but got: ${actualBalance}`);
        }
        await WalletView.hideBalance();
        await Assertions.checkIfElementToHaveText(WalletView.totalBalance, EXPECTED_HIDDEN_BALANCE);
        await TabBarComponent.tapSettings();
        await TabBarComponent.tapWallet();
        await Assertions.checkIfVisible(WalletView.container);
        await Assertions.checkIfVisible(WalletView.totalBalance);
        await Assertions.checkIfElementToHaveText(WalletView.totalBalance, EXPECTED_HIDDEN_BALANCE);
        await WalletView.showBalance();
        await Assertions.checkIfElementToHaveText(WalletView.totalBalance, actualBalance);
      },
    );
  });
});
