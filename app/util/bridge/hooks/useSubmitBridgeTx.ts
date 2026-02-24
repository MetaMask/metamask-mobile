import type { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import { BridgeQuoteResponse } from '../../../components/UI/Bridge/types';
import Engine from '../../../core/Engine';
import { useSelector } from 'react-redux';
import { selectShouldUseSmartTransaction } from '../../../selectors/smartTransactionsController';
import { selectSourceWalletAddress } from '../../../selectors/bridge';
import { handleIntentTransaction } from '../../../lib/transaction/intent';

export default function useSubmitBridgeTx() {
  const stxEnabled = useSelector(selectShouldUseSmartTransaction);
  const walletAddress = useSelector(selectSourceWalletAddress);

  const submitBridgeTx = async ({
    quoteResponse,
    location,
  }: {
    quoteResponse: BridgeQuoteResponse;
    /** The entry point from which the user initiated the swap or bridge */
    location?: MetaMetricsSwapsEventSource;
  }) => {
    // check whether quoteResponse is an intent transaction
    if (quoteResponse.quote.intent) {
      return handleIntentTransaction(quoteResponse, walletAddress);
    }
    if (!walletAddress) {
      throw new Error('Wallet address is not set');
    }
    return Engine.context.BridgeStatusController.submitTx(
      walletAddress,
      {
        ...quoteResponse,
        approval: quoteResponse.approval ?? undefined,
      },
      stxEnabled,
      undefined, // quotesReceivedContext
      location,
    );
  };

  return { submitBridgeTx };
}
