import type { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import { BridgeQuoteResponse } from '../../../components/UI/Bridge/types';
import Engine from '../../../core/Engine';
import { useSelector } from 'react-redux';
import { selectShouldUseSmartTransaction } from '../../../selectors/smartTransactionsController';
import { selectSourceWalletAddress } from '../../../selectors/bridge';

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
    if (!walletAddress) {
      throw new Error('Wallet address is not set');
    }

    // check whether quoteResponse is an intent transaction
    if (quoteResponse.quote.intent) {
      return Engine.context.BridgeStatusController.submitIntent({
        quoteResponse: quoteResponse as unknown as Parameters<
          typeof Engine.context.BridgeStatusController.submitIntent
        >[0]['quoteResponse'],
        accountAddress: walletAddress,
        location,
      });
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
