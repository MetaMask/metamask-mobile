import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import Assertions from '../../../tests/framework/Assertions';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';
import QuoteView from '../../pages/swaps/QuoteView';
import SwapView from '../../pages/swaps/SwapView';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';
import { LocalNode } from '../../../tests/framework/types';
import { AnvilPort } from '../../../tests/framework/fixtures/FixtureUtils';
import { AnvilManager } from '../../../tests/seeder/anvil-manager';

const sourceTokenSymbol = 'ETH';
const destTokenSymbol = 'DAI';
const quantity = '.03';

// Skipping as this test is not being used in any of the smoke tests nor regression tests
describe.skip('NFT Details page', () => {
  it('show nft details', async () => {
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
                chainId: '0x539',
                rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
                type: 'custom',
                nickname: 'Local RPC',
                ticker: 'ETH',
              },
            })
            .build();
        },
        restartDevice: true,
      },
      async () => {
        // Launch app and login
        await loginToApp();

        // Navigate to NFT details
        await TabBarComponent.tapWallet();

        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapSwapButton();
        await QuoteView.enterAmount(quantity);

        //Select destination token
        await QuoteView.tapDestinationToken();
        await QuoteView.tapSearchToken();
        await QuoteView.typeSearchToken(destTokenSymbol);
        await QuoteView.selectToken(destTokenSymbol);

        await Assertions.expectElementToBeVisible(SwapView.quoteSummary);
        await Assertions.expectElementToBeVisible(SwapView.gasFee);
        await SwapView.tapIUnderstandPriceWarning();
        await SwapView.tapSwapButton();

        // Check the swap activity completed
        await TabBarComponent.tapActivity();
        await Assertions.expectElementToBeVisible(ActivitiesView.title);
        await Assertions.expectElementToBeVisible(
          ActivitiesView.swapActivityTitle(sourceTokenSymbol, destTokenSymbol),
        );
      },
    );
  });
});
