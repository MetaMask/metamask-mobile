'use strict';

import { Regression } from '../../tags';
import TestHelpers from '../../helpers';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import { loginToApp } from '../../viewHelper';
import WalletView from '../../pages/wallet/WalletView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import Assertions from '../../utils/Assertions';
import Gestures from '../../utils/Gestures';

// Type definitions for the test constants
const EXPECTED_BALANCE: string = 'ETH 1,000.00';
const EXPECTED_HIDDEN_BALANCE: string = '••••••••••••';

// Interface for fixture configuration
interface FixtureConfig {
  fixture: any;
  restartDevice: boolean;
}

describe(Regression('Balance Privacy Toggle'), (): void => {
  beforeAll(async (): Promise<void> => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('should toggle balance visibility when balance container is tapped', async (): Promise<void> => {
    const fixtureConfig: FixtureConfig = {
      fixture: new FixtureBuilder()
        .withETHAsPrimaryCurrency() // Set primary currency to ETH
        .build(),
      restartDevice: true,
    };

    await withFixtures(
      fixtureConfig,
      async (): Promise<void> => {
        await loginToApp();
        
        const actualBalance: string = await WalletView.getBalanceText();
        await Assertions.checkIfTextMatches(actualBalance, EXPECTED_BALANCE);

        // Hide balance
        await Gestures.waitAndTap(WalletView.eyeSlashIcon);
        await Assertions.checkIfElementToHaveText(WalletView.totalBalance, EXPECTED_HIDDEN_BALANCE);

        // Test state persistence
        await TabBarComponent.tapSettings();
        await TabBarComponent.tapWallet();
        await Assertions.checkIfElementToHaveText(WalletView.totalBalance, EXPECTED_HIDDEN_BALANCE);
        
        // Show balance
        await Gestures.waitAndTap(WalletView.eyeSlashIcon);
        await Assertions.checkIfElementToHaveText(WalletView.totalBalance, actualBalance);
      },
    );
  });
}); 