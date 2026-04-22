import { useSelector } from 'react-redux';
import type {
  MetaMetricsSwapsEventSource,
  QuoteMetadata,
  QuoteResponse,
} from '@metamask/bridge-controller';
import Engine from '../../../../../../core/Engine';
import { selectShouldUseSmartTransaction } from '../../../../../../selectors/smartTransactionsController';
import { withPendingTransactionActiveAbTests } from '../../../../../../util/transactions/transaction-active-ab-test-attribution-registry';

interface UseSubmitQuickBuyTxParams {
  /**
   * Wallet address that will own the transaction. Passed in directly so this
   * hook does not depend on `selectSourceWalletAddress`, which reads from the
   * bridge Redux slice that QuickBuy intentionally avoids dispatching into.
   */
  walletAddress: string | undefined;
}

/**
 * QuickBuy-local replacement for `useSubmitBridgeTx`. Calls
 * `BridgeStatusController.submitTx` / `submitIntent` directly with the
 * provided wallet address. Skips the A/B-test analytics enrichment that the
 * Bridge/Swaps flow adds (those read `selectAbTestContext` from the bridge
 * slice and are not relevant to QuickBuy).
 */
export function useSubmitQuickBuyTx({
  walletAddress,
}: UseSubmitQuickBuyTxParams) {
  const stxEnabled = useSelector(selectShouldUseSmartTransaction);

  const submitQuickBuyTx = async ({
    quoteResponse,
    location,
  }: {
    quoteResponse: QuoteResponse & QuoteMetadata;
    location?: MetaMetricsSwapsEventSource;
  }) => {
    if (!walletAddress) {
      throw new Error('Wallet address is not set');
    }
    return withPendingTransactionActiveAbTests(undefined, async () => {
      if (quoteResponse.quote.intent) {
        return Engine.context.BridgeStatusController.submitIntent({
          quoteResponse,
          accountAddress: walletAddress,
          location,
        });
      }
      return Engine.context.BridgeStatusController.submitTx(
        walletAddress,
        { ...quoteResponse, approval: quoteResponse.approval ?? undefined },
        stxEnabled,
        undefined,
        location,
      );
    });
  };

  return { submitQuickBuyTx };
}
