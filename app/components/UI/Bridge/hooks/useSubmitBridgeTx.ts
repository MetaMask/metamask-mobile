import useHandleBridgeTx from './useHandleBridgeTx';
import useHandleApprovalTx from './useHandleApprovalTx';
import { TransactionMeta } from '@metamask/transaction-controller';
import { QuoteResponse } from '../types';

export default function useSubmitBridgeTx() {
  const { handleBridgeTx } = useHandleBridgeTx();
  const { handleApprovalTx } = useHandleApprovalTx();

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
    return txResult;
  };

  return { submitBridgeTx };
}
