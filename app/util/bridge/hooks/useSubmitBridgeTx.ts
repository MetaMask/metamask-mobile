import useHandleBridgeTx from './useHandleBridgeTx';
import useHandleApprovalTx from './useHandleApprovalTx';
import { TransactionMeta } from '@metamask/transaction-controller';
import { QuoteResponse } from '../../../components/UI/Bridge/types';
import { zeroAddress } from 'ethereumjs-util';
import useAddToken from './useAddToken';
import Engine from '../../../core/Engine';
import { useSelector } from 'react-redux';
import { selectQuoteRequest } from '../../../selectors/bridgeController';
import { serializeQuoteMetadata } from '..';
import { QuoteMetadata } from '@metamask/bridge-controller';

export default function useSubmitBridgeTx() {
  const { handleBridgeTx } = useHandleBridgeTx();
  const { handleApprovalTx } = useHandleApprovalTx();
  const { addSourceToken, addDestToken } = useAddToken();
  const { slippage } = useSelector(selectQuoteRequest);

  const submitBridgeTx = async ({
    quoteResponse,
  }: {
    quoteResponse: QuoteResponse & QuoteMetadata;
  }) => {
    let approvalTxMeta: TransactionMeta | undefined;
    if (quoteResponse.approval) {
      approvalTxMeta = await handleApprovalTx({
        approval: quoteResponse.approval,
        quoteResponse,
      });
    }
    const txResult = await handleBridgeTx({
      quoteResponse,
      approvalTxId: approvalTxMeta?.id,
    });

    // Start polling for tx history
    try {
      Engine.context.BridgeStatusController.startPollingForBridgeTxStatus({
        bridgeTxMeta: txResult,
        statusRequest: {
          bridgeId: quoteResponse.quote.bridgeId,
          bridge: quoteResponse.quote.bridges[0],
          srcChainId: quoteResponse.quote.srcChainId,
          destChainId: quoteResponse.quote.destChainId,
          quote: quoteResponse.quote,
          refuel: Boolean(quoteResponse.quote.refuel),
          srcTxHash: txResult.hash, // This might be undefined for STX
        },
        quoteResponse: serializeQuoteMetadata(quoteResponse),
        slippagePercentage: slippage ?? 0,
        startTime: txResult.time,
      });
    } catch (error) {
      throw new Error('error starting bridge tx status polling: ' + error);
    }

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
