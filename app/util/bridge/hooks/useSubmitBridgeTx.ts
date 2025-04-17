import { QuoteResponse } from '../../../components/UI/Bridge/types';
import Engine from '../../../core/Engine';
import { QuoteMetadata } from '@metamask/bridge-controller';
import { useSelector } from 'react-redux';
import { selectSmartTransactionsEnabled } from '../../../selectors/smartTransactionsController';

export default function useSubmitBridgeTx() {
  const stxEnabled = useSelector(selectSmartTransactionsEnabled);

  const submitBridgeTx = async ({
    quoteResponse,
  }: {
    quoteResponse: QuoteResponse & QuoteMetadata;
  }) => {
    console.log('submitBridgeTx', quoteResponse);
    const txResult = await Engine.context.BridgeStatusController.submitTx(quoteResponse, stxEnabled);

    return txResult;
  };

  return { submitBridgeTx };
}
