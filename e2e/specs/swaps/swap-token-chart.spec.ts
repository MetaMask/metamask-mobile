'use strict';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { LocalNodeType } from '../../framework/types';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletView from '../../pages/wallet/WalletView';
import TokenOverview from '../../pages/wallet/TokenOverview';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import TestHelpers from '../../helpers';
import { Regression } from '../../tags';
import Assertions from '../../framework/Assertions';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';
import { ActivitiesViewSelectorsText } from '../../selectors/Transactions/ActivitiesView.selectors';
import { submitSwapUnifiedUI } from './helpers/swap-unified-ui';
import { testSpecificMock } from '../swaps/helpers/swap-mocks';
import { prepareSwapsTestEnvironment } from './helpers/prepareSwapsTestEnvironment';

describe(Regression('Swap from Token view'), (): void => {
  jest.setTimeout(120000);

  it('should complete a USDC to DAI swap from the token chart', async (): Promise<void> => {
    const FIRST_ROW: number = 0;
    const quantity: string = '1';
    const sourceTokenSymbol: string = 'ETH';
    const destTokenSymbol: string = 'DAI';
    const chainId = '0x1';

    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withGanacheNetwork(chainId)
          .withDisabledSmartTransactions()
          .build(),
        localNodeOptions: [
          {
            type: LocalNodeType.ganache,
            options: {
              chainId: 1,
            },
          },
        ],
        testSpecificMock,
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await prepareSwapsTestEnvironment();
        await TabBarComponent.tapWallet();
        await Assertions.expectElementToBeVisible(WalletView.container);
        await WalletView.tapOnToken('Ethereum');
        await Assertions.expectElementToBeVisible(TokenOverview.container);
        await TokenOverview.scrollOnScreen();
        await TestHelpers.delay(1000);
        await TokenOverview.tapSwapButton();

        // Submit the Swap
        await submitSwapUnifiedUI(
          quantity,
          sourceTokenSymbol,
          destTokenSymbol,
          '0x1',
        );

        // After the swap is complete, the DAI balance shouldn't be 0
        await Assertions.expectTextNotDisplayed('0 DAI', { timeout: 60000 });

        // Check the swap activity completed
        await Assertions.expectElementToBeVisible(ActivitiesView.title);
        await Assertions.expectElementToBeVisible(
          ActivitiesView.swapActivityTitle(sourceTokenSymbol, destTokenSymbol),
        );
        await Assertions.expectElementToHaveText(
          ActivitiesView.transactionStatus(FIRST_ROW),
          ActivitiesViewSelectorsText.CONFIRM_TEXT,
        );
      },
    );
  });
});
