import { useSelector } from 'react-redux';
import type {
  MetaMetricsSwapsEventSource,
  QuoteResponse,
} from '@metamask/bridge-controller';

import Engine from '../../../../../core/Engine';
import {
  selectBatchSellDestToken,
  selectBatchSellSourceTokens,
} from '../../../../../core/redux/slices/bridge';
import { RootState } from '../../../../../reducers';
import { selectBatchSellSourceWalletAddress } from '../../../../../selectors/bridge';
import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';
import { getMaybeHexChainId } from '../../../../../util/bridge';

export function useSubmitBatchSellTx() {
  const sourceTokens = useSelector(selectBatchSellSourceTokens);
  const batchSellChainId = getMaybeHexChainId(sourceTokens[0]?.chainId);
  const smartTransactionsEnabled = useSelector((state: RootState) =>
    selectShouldUseSmartTransaction(state, batchSellChainId),
  );
  const walletAddress = useSelector(selectBatchSellSourceWalletAddress);
  const destToken = useSelector(selectBatchSellDestToken);

  const submitBatchSellTx = async ({
    quoteResponses,
    location,
  }: {
    quoteResponses: (QuoteResponse | null)[];
    /** The entry point from which the user initiated the swap or bridge */
    location?: MetaMetricsSwapsEventSource;
  }) => {
    if (!walletAddress) {
      throw new Error('Batch Sell wallet address is not set');
    }

    const tokenSecurityTypeDestination = destToken?.securityData?.type ?? null;

    return await Engine.context.BridgeStatusController.submitBatchSell({
      quoteResponses,
      accountAddress: walletAddress,
      location,
      isStxEnabled: smartTransactionsEnabled,
      quotesReceivedContext: undefined,
      tokenSecurityTypeDestination,
    });
  };

  return { submitBatchSellTx };
}
