import { QuoteResponse } from '../../../components/UI/Bridge/types';
import Engine from '../../../core/Engine';
import { QuoteMetadata } from '@metamask/bridge-controller';
import { useSelector } from 'react-redux';
import { selectSmartTransactionsEnabled } from '../../../selectors/smartTransactionsController';
import { addSwapsTransaction } from '../../swaps/swaps-transactions';
import Logger from '../../Logger';

const LOG_PREFIX = 'Bridge Transactions';

export default function useSubmitBridgeTx() {
  const stxEnabled = useSelector(selectSmartTransactionsEnabled);

  const submitBridgeTx = async ({
    quoteResponse,
  }: {
    quoteResponse: QuoteResponse & QuoteMetadata;
  }) => {
    try {
      const txResult = await Engine.context.BridgeStatusController.submitTx(quoteResponse, stxEnabled);
      
      // Record the transaction for history tracking, especially important for Solana swaps
      if (txResult && quoteResponse?.quote) {
        const { quote } = quoteResponse;
        const transactionMeta = {
          action: quote.srcChainId === quote.destChainId ? 'swap' : 'bridge',
          sourceToken: {
            address: quote.srcAsset?.address,
            symbol: quote.srcAsset?.symbol,
            decimals: quote.srcAsset?.decimals,
            chainId: quote.srcChainId,
          },
          destinationToken: {
            address: quote.destAsset?.address,
            symbol: quote.destAsset?.symbol,
            decimals: quote.destAsset?.decimals,
            chainId: quote.destChainId,
          },
          sourceAmount: quote.srcTokenAmount,
          destinationAmount: quote.destTokenAmount,
          bridgeId: quote.bridgeId,
        };

        // Add to swaps transactions for consistent history tracking
        const txId = txResult.hash || txResult.id || Date.now().toString();
        addSwapsTransaction(txId, transactionMeta);
        Logger.log(LOG_PREFIX, 'Transaction recorded for history', transactionMeta);
      }

      return txResult;
    } catch (error) {
      Logger.error(error as Error, `${LOG_PREFIX}: Failed to submit bridge transaction`);
      throw error;
    }
  };

  return { submitBridgeTx };
}
