import { QuoteResponse } from '../../../components/UI/Bridge/types';
import Engine from '../../../core/Engine';
import { QuoteMetadata } from '@metamask/bridge-controller';
import { useSelector } from 'react-redux';
import { selectShouldUseSmartTransaction } from '../../../selectors/smartTransactionsController';
import Logger from 'app/util/Logger';

export default function useSubmitBridgeTx() {
  const stxEnabled = useSelector(selectShouldUseSmartTransaction);

  const submitBridgeTx = async ({
    quoteResponse,
  }: {
    quoteResponse: QuoteResponse & QuoteMetadata;
  }) => {
    const txResult = await Engine.context.BridgeStatusController.submitTx(
      {
        ...quoteResponse,
        approval: quoteResponse.approval ?? undefined,
      },
      stxEnabled,
    );
    Logger.log('Bridge transaction submitted', txResult);

    return txResult;
  };

  return { submitBridgeTx };
}
