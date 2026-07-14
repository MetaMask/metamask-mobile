import { loginToAppPlaywright } from './wallet.flow';
import TabBarComponent from '../page-objects/wallet/TabBarComponent';
import QuoteView from '../page-objects/swaps/QuoteView';
import WalletView from '../page-objects/wallet/WalletView';
import Assertions from '../framework/Assertions';
import ActivitiesView from '../page-objects/Transactions/ActivitiesView';
import { prepareSwapsTestEnvironment } from '../helpers/swap/prepareSwapsTestEnvironment';
import { ActivitiesViewSelectorsText } from '../../app/components/Views/ActivityView/ActivitiesView.testIds';

/**
 * Runs the ETH (Mainnet) -> ETH (Base) bridge flow, from opening the swap
 * screen through the transaction showing as Confirmed in the activity list.
 */
export async function runEthToBaseBridgeFlow(
  destNetwork: string,
): Promise<void> {
  const quantity = '1';
  const sourceSymbol = 'ETH';
  const destChainId = '0x2105';
  // Row 0 is a stale STX-shaped entry; the confirmed bridge tx is on row 1.
  // TODO: stop merging SmartTransactionsController state into
  // selectLocalTransactions / selectSortedTransactions, then assert row 0.
  const BRIDGE_ROW = 1;

  await loginToAppPlaywright({ scenarioType: 'e2e' });
  await prepareSwapsTestEnvironment();

  await TabBarComponent.tapWallet();
  await WalletView.tapWalletSwapButton();
  await Assertions.expectElementToBeVisible(QuoteView.sourceTokenArea, {
    timeout: 20000,
    description: 'Swap screen source token area visible',
  });
  await QuoteView.tapDestinationToken();
  await QuoteView.selectNetwork(destNetwork);
  await QuoteView.tapToken(destChainId, sourceSymbol);
  // Open keypad by tapping source amount input (keypad is in BottomSheet, closed after token selection)
  await QuoteView.tapSourceAmountInput();
  await QuoteView.enterAmount(quantity);
  await Assertions.expectElementToBeVisible(QuoteView.networkFeeLabel, {
    timeout: 60000,
    description: 'Network fee label visible',
  });
  await QuoteView.dismissKeypad();
  await Assertions.expectElementToBeVisible(QuoteView.confirmBridge, {
    description: 'Confirm bridge button visible',
  });

  await QuoteView.tapConfirmBridge();

  await Assertions.expectElementToBeVisible(ActivitiesView.title, {
    timeout: 30000,
    description: 'Activity title visible after bridge submission',
  });
  await Assertions.expectElementToBeVisible(
    ActivitiesView.bridgeActivityTitle(destNetwork),
    {
      description: 'Bridge activity for destination network visible',
    },
  );

  await Assertions.expectElementToHaveText(
    ActivitiesView.transactionStatus(BRIDGE_ROW),
    ActivitiesViewSelectorsText.CONFIRM_TEXT,
    {
      timeout: 120000,
      description: 'Bridge transaction should show Confirmed status',
    },
  );
}
