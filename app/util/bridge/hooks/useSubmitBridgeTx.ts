import { QuoteMetadata } from '@metamask/bridge-controller';
import { useSelector } from 'react-redux';
import { CowSwapQuoteResponse } from '../../../components/UI/Bridge/types';
import Engine from '../../../core/Engine';
import { handleIntentTransaction } from '../../../lib/transaction/intent';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
import { selectShouldUseSmartTransaction } from '../../../selectors/smartTransactionsController';

export default function useSubmitBridgeTx() {
  const stxEnabled = useSelector(selectShouldUseSmartTransaction);
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

    // submit tx to bridge
    const txResult = await Engine.context.BridgeStatusController.submitTx(
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
