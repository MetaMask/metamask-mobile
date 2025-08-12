import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import Assertions from '../../framework/Assertions';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import QuoteView from '../../pages/swaps/QuoteView';
import SwapView from '../../pages/swaps/SwapView';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';

const sourceTokenSymbol = 'ETH';
const destTokenSymbol = 'DAI';
const quantity = '.03';

// Skipping as this test is not being used in any of the smoke tests nor regression tests
describe.skip('NFT Details page', () => {
  it('show nft details', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withGanacheNetwork().build(),
      },
      async () => {
        // Launch app and login
        await loginToApp();

        // Navigate to NFT details
        await TabBarComponent.tapWallet();

        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapSwapButton();

        await Assertions.expectElementToBeVisible(QuoteView.getQuotes);

        await QuoteView.enterSwapAmount(quantity);

        //Select destination token
        await QuoteView.tapOnSelectDestToken();
        await QuoteView.tapSearchToken();
        await QuoteView.typeSearchToken(destTokenSymbol);
        await QuoteView.selectToken(destTokenSymbol);

        await QuoteView.tapOnGetQuotes();
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
