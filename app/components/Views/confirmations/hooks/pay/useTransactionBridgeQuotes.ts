import { useTransactionPayTokenAmounts } from './useTransactionPayTokenAmounts';
import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { BridgeQuoteRequest, getBridgeQuotes } from '../../utils/bridge';
import { useEffect, useMemo } from 'react';
import { useTransactionPayToken } from './useTransactionPayToken';
import { useTransactionRequiredTokens } from './useTransactionRequiredTokens';
import { useDispatch } from 'react-redux';
import { setTransactionBridgeQuotes } from '../../../../../core/redux/slices/confirmationMetrics';
import { useTransactionMetadataOrThrow } from '../transactions/useTransactionMetadataRequest';
import { Hex, createProjectLogger } from '@metamask/utils';

const log = createProjectLogger('transaction-pay');

export function useTransactionBridgeQuotes() {
  const dispatch = useDispatch();
  const transactionMeta = useTransactionMetadataOrThrow();

  const {
    chainId: targetChainId,
    id: transactionId,
    txParams: { from },
  } = transactionMeta;

  const {
    payToken: { address: sourceTokenAddress, chainId: sourceChainId },
  } = useTransactionPayToken();

  const sourceAmounts = useTransactionPayTokenAmounts();
  const requiredTokens = useTransactionRequiredTokens();

  const requests: (BridgeQuoteRequest | undefined)[] = useMemo(
    () =>
      sourceAmounts?.map((sourceTokenAmount, index) => {
        const { address: targetTokenAddress } = requiredTokens[index] || {};

        if (!sourceTokenAmount) {
          return undefined;
        }

        return {
          from: from as Hex,
          sourceChainId,
          sourceTokenAddress,
          sourceTokenAmount,
          targetChainId,
          targetTokenAddress,
        };
      }) ?? [],
    [
      from,
      requiredTokens,
      sourceAmounts,
      sourceChainId,
      sourceTokenAddress,
      targetChainId,
    ],
  );

  const { pending: loading, value: quotes } = useAsyncResult(async () => {
    if (requests.some((request) => !request)) {
      return [];
    }

    return getBridgeQuotes(requests as BridgeQuoteRequest[]);
  }, [requests]);

  useEffect(() => {
    dispatch(setTransactionBridgeQuotes({ transactionId, quotes }));

    log('Bridge quotes', { transactionId, quotes });
  }, [dispatch, quotes, transactionId]);

  return { loading, quotes };
}
