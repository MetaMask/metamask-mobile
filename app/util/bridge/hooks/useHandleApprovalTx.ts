import { TransactionType } from '@metamask/transaction-controller';
import useHandleTx from './useHandleTx';
import { QuoteResponse, TxData } from '../../../components/UI/Bridge/types';

export const ALLOWANCE_RESET_ERROR = 'Eth USDT allowance reset failed';
export const APPROVAL_TX_ERROR = 'Approve transaction failed';

export default function useHandleApprovalTx() {
  const { handleTx } = useHandleTx();

  const handleApprovalTx = async ({
    approval,
    quoteResponse,
  }: {
    approval: TxData;
    quoteResponse: QuoteResponse;
  }) => {
    try {
      const txMeta = await handleTx({
        txType: TransactionType.bridgeApproval,
        txParams: approval,
        fieldsToAddToTxMeta: {
          sourceTokenSymbol: quoteResponse.quote.srcAsset.symbol,
        },
      });

      return txMeta;
    } catch (e) {
      throw new Error(`${APPROVAL_TX_ERROR}: ${e}`);
    }
  };
  return {
    handleApprovalTx,
  };
}
