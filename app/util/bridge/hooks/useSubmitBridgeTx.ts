import { CowSwapQuoteResponse } from '../../../components/UI/Bridge/types';
import Engine from '../../../core/Engine';
import { QuoteMetadata } from '@metamask/bridge-controller';
import { useSelector } from 'react-redux';
import { selectShouldUseSmartTransaction } from '../../../selectors/smartTransactionsController';
import { selectSourceWalletAddress } from '../../../selectors/bridge';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
import { handleIntentTransaction } from '../../../lib/transaction/intent';

export default function useSubmitBridgeTx() {
  const stxEnabled = useSelector(selectShouldUseSmartTransaction);
  const walletAddress = useSelector(selectSourceWalletAddress);
  const selectedAccountAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );

  const submitBridgeTx = async ({
    quoteResponse,
  }: {
    quoteResponse: CowSwapQuoteResponse & QuoteMetadata;
  }) => {
    // check quoteResponse is intent transaction
    if (quoteResponse.quote.intent) {
      // Get the SignatureControllerMessenger
      const txResult = await handleIntentTransaction(
        quoteResponse,
        selectedAccountAddress,
      );
      return txResult;
    }

    if (!walletAddress) {
      throw new Error('Wallet address is not set');
    }
    const txResult = await Engine.context.BridgeStatusController.submitTx(
      walletAddress,
      {
        ...quoteResponse,
        approval: quoteResponse.approval ?? undefined,
      },
      stxEnabled,
    );

    return txResult;
  };

  return { submitBridgeTx };
}
