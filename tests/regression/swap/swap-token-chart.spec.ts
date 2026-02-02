'use strict';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.ts';
import { LocalNode, LocalNodeType } from '../../framework/types.ts';
import { loginToApp } from '../../../e2e/viewHelper.ts';
import TabBarComponent from '../../../e2e/pages/wallet/TabBarComponent.ts';
import WalletView from '../../../e2e/pages/wallet/WalletView.ts';
import TokenOverview from '../../../e2e/pages/wallet/TokenOverview.ts';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.ts';
import TestHelpers from '../../../e2e/helpers';
import { RegressionTrade } from '../../../e2e/tags';
import Assertions from '../../framework/Assertions.ts';
import ActivitiesView from '../../../e2e/pages/Transactions/ActivitiesView.ts';
import { ActivitiesViewSelectorsText } from '../../../app/components/Views/ActivityView/ActivitiesView.testIds.ts';
import { submitSwapUnifiedUI } from '../../helpers/swap/swap-unified-ui.ts';
import { testSpecificMock } from '../../helpers/swap/swap-mocks.ts';
import { prepareSwapsTestEnvironment } from '../../helpers/swap/prepareSwapsTestEnvironment.ts';
import { AnvilPort } from '../../framework/fixtures/FixtureUtils.ts';
import { AnvilManager } from '../../seeder/anvil-manager.ts';

describe(RegressionTrade('Swap from Token view'), (): void => {
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
