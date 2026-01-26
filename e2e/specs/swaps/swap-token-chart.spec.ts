'use strict';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';
import { LocalNode, LocalNodeType } from '../../../tests/framework/types';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletView from '../../pages/wallet/WalletView';
import TokenOverview from '../../pages/wallet/TokenOverview';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import TestHelpers from '../../helpers';
import { SmokeTrade } from '../../tags';
import Assertions from '../../../tests/framework/Assertions';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';
import { ActivitiesViewSelectorsText } from '../../../app/components/Views/ActivityView/ActivitiesView.testIds';
import { submitSwapUnifiedUI } from './helpers/swap-unified-ui';
import { testSpecificMock } from '../swaps/helpers/swap-mocks';
import { prepareSwapsTestEnvironment } from './helpers/prepareSwapsTestEnvironment';
import { AnvilPort } from '../../../tests/framework/fixtures/FixtureUtils';
import { AnvilManager } from '../../../tests/seeder/anvil-manager';

describe(SmokeTrade('Swap from Token view'), (): void => {
  jest.setTimeout(120000);

  it('should complete a USDC to DAI swap from the token chart', async (): Promise<void> => {
    const FIRST_ROW: number = 0;
    const quantity: string = '1';
    const sourceTokenSymbol: string = 'ETH';
    const destTokenSymbol: string = 'DAI';
    const chainId = '0x1';

    await withFixtures(
      {
        fixture: ({ localNodes }: { localNodes?: LocalNode[] }) => {
          const node = localNodes?.[0] as unknown as AnvilManager;
          const rpcPort =
            node instanceof AnvilManager
              ? (node.getPort() ?? AnvilPort())
              : undefined;

          return new FixtureBuilder()
            .withNetworkController({
              providerConfig: {
                chainId,
                rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
                type: 'custom',
                nickname: 'Localhost',
                ticker: 'ETH',
              },
            })
            .withDisabledSmartTransactions()
            .build();
        },
        localNodeOptions: [
          {
            type: LocalNodeType.anvil,
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
