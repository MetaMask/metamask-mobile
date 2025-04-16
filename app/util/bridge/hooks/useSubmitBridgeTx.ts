import { QuoteResponse } from '../../../components/UI/Bridge/types';
import { zeroAddress } from 'ethereumjs-util';
import useAddToken from './useAddToken';
import Engine from '../../../core/Engine';
import { QuoteMetadata } from '@metamask/bridge-controller';
import { useSelector } from 'react-redux';
import { selectSmartTransactionsEnabled } from '../../../selectors/smartTransactionsController';

export default function useSubmitBridgeTx() {
  const { addSourceToken, addDestToken } = useAddToken();
  const stxEnabled = useSelector(selectSmartTransactionsEnabled);

  const submitBridgeTx = async ({
    quoteResponse,
  }: {
    quoteResponse: QuoteResponse & QuoteMetadata;
  }) => {
    const txResult = await Engine.context.BridgeStatusController.submitTx(quoteResponse, stxEnabled);

    // Add tokens if not the native gas token
    if (quoteResponse.quote.srcAsset.address !== zeroAddress()) {
      addSourceToken(quoteResponse);
    }
    if (quoteResponse.quote.destAsset.address !== zeroAddress()) {
      await addDestToken(quoteResponse);
    }

    return txResult;
  };

  return { submitBridgeTx };
}
