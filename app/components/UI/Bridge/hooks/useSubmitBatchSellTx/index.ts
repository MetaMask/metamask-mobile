import { useSelector } from 'react-redux';
import type {
  MetaMetricsSwapsEventSource,
  QuoteMetadata,
  QuoteResponse,
} from '@metamask/bridge-controller';

import Engine from '../../../../../core/Engine';
import { selectBatchSellDestToken } from '../../../../../core/redux/slices/bridge';
import { selectBatchSellSourceWalletAddress } from '../../../../../selectors/bridge';
import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';

export function useSubmitBatchSellTx() {
  const stxEnabled = useSelector(selectShouldUseSmartTransaction);
  const walletAddress = useSelector(selectBatchSellSourceWalletAddress);
  const destToken = useSelector(selectBatchSellDestToken);

  const submitBatchSellTx = async ({
    quoteResponses,
    location,
  }: {
    quoteResponses: ((QuoteResponse & QuoteMetadata) | null)[];
    /** The entry point from which the user initiated the swap or bridge */
    location?: MetaMetricsSwapsEventSource;
  }) => {
    if (!walletAddress) {
      throw new Error('Batch Sell wallet address is not set');
    }

    const tokenSecurityTypeDestination = destToken?.securityData?.type ?? null;
    const normalizedQuoteResponses = quoteResponses.map((quoteResponse) =>
      quoteResponse
        ? {
            ...quoteResponse,
            approval: quoteResponse.approval ?? undefined,
          }
        : quoteResponse,
    );

    return await Engine.context.BridgeStatusController.submitBatchSell({
      quoteResponses: normalizedQuoteResponses,
      accountAddress: walletAddress,
      location,
      isStxEnabled: stxEnabled,
      quotesReceivedContext: undefined,
      tokenSecurityTypeDestination,
    });
  };

  return { submitBatchSellTx };
}
