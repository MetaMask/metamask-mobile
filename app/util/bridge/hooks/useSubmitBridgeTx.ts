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
  }: {
    quoteResponse: BridgeQuoteResponse;
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
    );
  };

  return { submitBridgeTx };
}
