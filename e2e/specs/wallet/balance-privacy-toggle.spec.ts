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
        fixture: new FixtureBuilder()
          .withETHAsPrimaryCurrency() // Set primary currency to ETH
          .build(),
        restartDevice: true,
      },
      async (): Promise<void> => {

        await loginToApp();
        await TestHelpers.delay(2000);
        await Assertions.checkIfVisible(WalletView.container);
        await Assertions.checkIfVisible(WalletView.totalBalance);
        const actualBalance: string = await WalletView.getBalanceText();
        expect(actualBalance).toContain('ETH');
        expect(actualBalance).not.toContain('••••');
        await WalletView.hideBalance();
        await Assertions.checkIfElementToHaveText(WalletView.totalBalance, EXPECTED_HIDDEN_BALANCE);
        await TabBarComponent.tapSettings();
        await TabBarComponent.tapWallet();
        await TestHelpers.delay(2000);
        await Assertions.checkIfVisible(WalletView.container);
        await Assertions.checkIfVisible(WalletView.totalBalance);
        await Assertions.checkIfElementToHaveText(WalletView.totalBalance, EXPECTED_HIDDEN_BALANCE);
        await WalletView.showBalance();
        await Assertions.checkIfElementToHaveText(WalletView.totalBalance, actualBalance);
      },
    );
  });
}); 