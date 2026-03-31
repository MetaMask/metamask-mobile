import { useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectConfirmationMetricsById,
  updateConfirmationMetric,
} from '../../../../../core/redux/slices/confirmationMetrics';
import { RootState } from '../../../../../reducers';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useDeepMemo } from '../useDeepMemo';
import { Hex, Json, isCaipChainId, isHexString } from '@metamask/utils';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { TransactionType } from '@metamask/transaction-controller';
import { useTransactionPayToken } from './useTransactionPayToken';
import { BridgeToken } from '../../../../UI/Bridge/types';
import { hasTransactionType } from '../../utils/transaction';
import {
  useTransactionPayQuotes,
  useTransactionPayRequiredTokens,
} from './useTransactionPayData';
import { useTransactionPayAvailableTokens } from './useTransactionPayAvailableTokens';
import { useAccountTokens } from '../send/useAccountTokens';

/**
 * Dispatches UI-only mm_pay_* properties to confirmationMetrics.
 *
 * Core mm_pay_* properties (token, chain, use_case, fees, strategy, etc.)
 * are derived from controller state in getMetaMaskPayProperties and do not
 * depend on the confirmation screen lifecycle.
 *
 * This hook only provides properties that require live UI context:
 * token presented, quote status, available token list size, etc.
 */
export function useTransactionPayMetrics() {
  const dispatch = useDispatch();
  const transactionMeta = useTransactionMetadataRequest();
  const { payToken } = useTransactionPayToken();
  const highestBalanceChainId = useHighestBalanceCaipChainId();
  const automaticPayToken = useRef<BridgeToken>();
  const hasLoadedQuoteRef = useRef(false);
  const quotes = useTransactionPayQuotes();
  const { availableTokens: tokens } = useTransactionPayAvailableTokens();

  const transactionId = transactionMeta?.id ?? '';
  const storedMetrics = useSelector((state: RootState) =>
    selectConfirmationMetricsById(state, transactionId),
  );

  const hasQuotes = (quotes?.length ?? 0) > 0;

  if (hasQuotes && !hasLoadedQuoteRef.current) {
    hasLoadedQuoteRef.current = true;
  }

  const availableTokens = useMemo(
    () => tokens.filter((t) => !t.disabled),
    [tokens],
  );

  const primaryRequiredToken = useTransactionPayRequiredTokens().find(
    (t) => !t.skipIfBalance,
  );
  const sendingValue = Number(primaryRequiredToken?.amountHuman ?? '0');

  if (!automaticPayToken.current && payToken) {
    automaticPayToken.current = payToken;
  }

  const properties: Json = {};
  const sensitiveProperties: Json = {};

  if (payToken) {
    properties.mm_pay_token_presented =
      automaticPayToken.current?.symbol ?? null;

    properties.mm_pay_chain_presented =
      automaticPayToken.current?.chainId ?? null;

    properties.mm_pay_payment_token_list_size = availableTokens.length;

    properties.mm_pay_quote_requested =
      (storedMetrics?.properties?.mm_pay_quote_requested as boolean) ?? false;
    properties.mm_pay_quote_loaded = hasLoadedQuoteRef.current;
    properties.mm_pay_chain_highest_balance_caip =
      highestBalanceChainId ?? null;
  }

  if (
    payToken &&
    (hasTransactionType(transactionMeta, [TransactionType.perpsDeposit]) ||
      hasTransactionType(transactionMeta, [TransactionType.predictDeposit]))
  ) {
    properties.simulation_sending_assets_total_value = sendingValue;
  }

  const params = useDeepMemo(
    () => ({
      properties,
      sensitiveProperties,
    }),
    [properties, sensitiveProperties],
  );

  useEffect(() => {
    dispatch(updateConfirmationMetric({ id: transactionId, params }));
  }, [dispatch, transactionId, params]);
}

function useHighestBalanceCaipChainId(): string | undefined {
  const tokens = useAccountTokens();

  return useMemo(() => {
    // Aggregate fiat balances by chainId
    const balanceByChain = tokens.reduce<Record<string, number>>(
      (acc, token) => {
        const { chainId, fiat } = token;
        if (!chainId || !fiat?.balance) {
          return acc;
        }
        acc[chainId] = (acc[chainId] ?? 0) + fiat.balance;
        return acc;
      },
      {},
    );

    let highestChainId: string | undefined;
    let highestBalance = 0;

    for (const [chainId, balance] of Object.entries(balanceByChain)) {
      if (balance > highestBalance) {
        highestBalance = balance;
        highestChainId = chainId;
      }
    }

    if (isCaipChainId(highestChainId)) {
      return highestChainId;
    }

    if (isHexString(highestChainId)) {
      return toEvmCaipChainId(highestChainId as Hex);
    }

    return highestChainId;
  }, [tokens]);
}
