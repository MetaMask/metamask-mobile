import useHandleBridgeTx from './useHandleBridgeTx';
import useHandleApprovalTx from './useHandleApprovalTx';
import { TransactionMeta } from '@metamask/transaction-controller';
import { QuoteResponse } from '../../../components/UI/Bridge/types';
import { zeroAddress } from 'ethereumjs-util';
import useAddToken from './useAddToken';

export default function useSubmitBridgeTx() {
  const { handleBridgeTx } = useHandleBridgeTx();
  const { handleApprovalTx } = useHandleApprovalTx();
  const { addSourceToken, addDestToken } = useAddToken();

  const submitBridgeTx = async ({
    quoteResponse,
  }: {
    quoteResponse: QuoteResponse;
  }) => {
    let approvalTxMeta: TransactionMeta | undefined;
    if (quoteResponse.approval) {
      approvalTxMeta = await handleApprovalTx({
        approval: quoteResponse.approval,
        quoteResponse,
      });
    }
    const txResult = await handleBridgeTx({ quoteResponse, approvalTxId: approvalTxMeta?.id });

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
