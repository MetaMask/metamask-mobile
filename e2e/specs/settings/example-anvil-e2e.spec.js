import TestHelpers from '../../helpers';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import Assertions from '../../utils/Assertions';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import QuoteView from '../../pages/swaps/QuoteView';
import SwapView from '../../pages/swaps/SwapView';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';

const sourceTokenSymbol = 'ETH';
const destTokenSymbol = 'DAI';
const quantity = '.03';

describe('NFT Details page', () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
  });

  it('show nft details', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withGanacheNetwork().build(),
        restartDevice: true,
        localNodeOptions: [{ type: 'anvil' }],
        //   ganacheOptions: defaultGanacheOptions,
      },
      async () => {
        // Launch app and login
        await loginToApp();

        // Navigate to NFT details
        await TabBarComponent.tapWallet();

        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapSwapButton();

        await Assertions.checkIfVisible(QuoteView.getQuotes);

        await QuoteView.enterSwapAmount(quantity);

        //Select destination token
        await QuoteView.tapOnSelectDestToken();
        await QuoteView.tapSearchToken();
        await QuoteView.typeSearchToken(destTokenSymbol);
        await TestHelpers.delay(2000);
        await QuoteView.selectToken(destTokenSymbol);

        await QuoteView.tapOnGetQuotes();
        await Assertions.checkIfVisible(SwapView.quoteSummary);
        await Assertions.checkIfVisible(SwapView.gasFee);
        await SwapView.tapIUnderstandPriceWarning();
        await SwapView.tapSwapButton();
        //Wait for Swap to complete
        try {
          await Assertions.checkIfTextIsDisplayed(
            SwapView.generateSwapCompleteLabel(
              sourceTokenSymbol,
              destTokenSymbol,
            ),
            30000,
          );
        } catch (e) {
          // eslint-disable-next-line no-console
          console.log(`Swap complete didn't pop up: ${e}`);
        }
        // await device.enableSynchronization();
        await TestHelpers.delay(10000);

        // Check the swap activity completed
        await TabBarComponent.tapActivity();
        await Assertions.checkIfVisible(ActivitiesView.title);
        await Assertions.checkIfVisible(
          ActivitiesView.swapActivityTitle(sourceTokenSymbol, destTokenSymbol),
        );
      },
    );
  });
});

//   await WalletView.tapNftTab();
//   await WalletView.tapOnNftName();

//   // Verify NFT details are displayed
//   await Assertions.checkIfVisible(WalletView.nftTabContainer);
