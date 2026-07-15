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
  useIsTransactionPayQuoteLoading,
  useTransactionPayIsMaxAmount,
  useTransactionPayQuotes,
  useTransactionPayRequiredTokens,
} from './useTransactionPayData';
import { useTransactionPayAvailableTokens } from './useTransactionPayAvailableTokens';
import { useAccountTokens } from '../send/useAccountTokens';
import { usePaySectionSourceMetrics } from './usePaySectionSourceMetrics';
import { usePaySectionRecipientMetrics } from './usePaySectionRecipientMetrics';
import { useTransactionPaySelectedFiatPaymentMethod } from './useTransactionPaySelectedFiatPaymentMethod';
import { useFiatPaymentHighlightedActions } from './useFiatPaymentHighlightedActions';
import { normalizeMetaMaskPayPaymentMethod } from '../../utils/transaction-pay-metrics';

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
  const automaticPayToken = useRef<BridgeToken | undefined>(undefined);
  const hasLoadedQuoteRef = useRef(false);
  const quoteErrorsRef = useRef<Json[]>([]);
  const wasQuoteLoadingRef = useRef(false);
  const quotes = useTransactionPayQuotes();
  const isQuoteLoading = useIsTransactionPayQuoteLoading();
  const isMaxAmount = useTransactionPayIsMaxAmount();
  const { availableTokens: tokens, hasTokens } =
    useTransactionPayAvailableTokens();

  const presentedPaymentMethodRef = useRef<string | null>(null);
  const fiatPaymentActions = useFiatPaymentHighlightedActions();
  const selectedFiatMethod = useTransactionPaySelectedFiatPaymentMethod();

  const transactionId = transactionMeta?.id ?? '';
  const storedMetrics = useSelector((state: RootState) =>
    selectConfirmationMetricsById(state, transactionId),
  );

  const hasPayToken = !!payToken;
  const source = usePaySectionSourceMetrics(hasPayToken);
  const recipient = usePaySectionRecipientMetrics(source.selected, hasPayToken);

  const hasQuotes = (quotes?.length ?? 0) > 0;

  if (hasQuotes && !hasLoadedQuoteRef.current) {
    hasLoadedQuoteRef.current = true;
  }

  const availableTokens = useMemo(
    () => tokens.filter((t) => !t.disabled),
    [tokens],
  );

  const availablePaymentMethods = useMemo(() => {
    const methods = new Set<string>();

    if (availableTokens.length > 0) {
      methods.add('crypto');
    }

    for (const action of fiatPaymentActions) {
      const method = normalizeMetaMaskPayPaymentMethod(action.paymentType);

      if (method) {
        methods.add(method);
      }
    }

    return [...methods];
  }, [availableTokens, fiatPaymentActions]);

  const currentPaymentMethodSelection =
    normalizeMetaMaskPayPaymentMethod(selectedFiatMethod?.paymentType) ??
    (payToken ? 'crypto' : null);

  if (
    currentPaymentMethodSelection &&
    presentedPaymentMethodRef.current === null
  ) {
    presentedPaymentMethodRef.current = currentPaymentMethodSelection;
  }

  const primaryRequiredToken = useTransactionPayRequiredTokens().find(
    (t) => !t.skipIfBalance,
  );
  const sendingValue = Number(primaryRequiredToken?.amountHuman ?? '0');

  // Detect a failed quote-loading cycle: isLoading transitioned true -> false
  // AND ended with no quotes. One entry appended per failed cycle, oldest-first.
  if (wasQuoteLoadingRef.current && !isQuoteLoading && !hasQuotes) {
    const inputType = storedMetrics?.properties?.mm_pay_amount_input_type as
      | string
      | undefined;
    const percentageMatch = inputType?.match(/^(\d+)%$/);
    quoteErrorsRef.current = [
      ...quoteErrorsRef.current,
      {
        pay_token: {
          symbol: payToken?.symbol ?? null,
          chainId: payToken?.chainId ?? null,
          address: payToken?.address ?? null,
        },
        amount: sendingValue,
        percentage_amount: percentageMatch ? Number(percentageMatch[1]) : null,
        percentage_max: percentageMatch ? isMaxAmount : null,
        error_message: 'unknown',
      },
    ];
  }
  wasQuoteLoadingRef.current = isQuoteLoading;

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

    properties.mm_pay_account_type_source_presented = source.presented;
    properties.mm_pay_account_type_source_selected = source.selected;
    properties.mm_pay_source_mm_account_switch_count = source.switchCount;

    properties.mm_pay_account_type_recipient_presented = recipient.presented;
    properties.mm_pay_account_type_recipient_selected = recipient.selected;
    properties.mm_pay_recipient_mm_account_switch_count = recipient.switchCount;

    properties.mm_pay_entry_point = getEntryPoint(transactionMeta) ?? null;
  }

  properties.mm_pay_payment_method_available = availablePaymentMethods;

  if (presentedPaymentMethodRef.current) {
    properties.mm_pay_payment_method_presented =
      presentedPaymentMethodRef.current;
  }

  if (quoteErrorsRef.current.length > 0) {
    properties.mm_pay_quote_errors = quoteErrorsRef.current;
  }

  if (
    payToken &&
    (hasTransactionType(transactionMeta, [TransactionType.perpsDeposit]) ||
      hasTransactionType(transactionMeta, [TransactionType.predictDeposit]) ||
      hasTransactionType(transactionMeta, [
        TransactionType.predictDepositAndOrder,
      ]) ||
      hasTransactionType(transactionMeta, [
        TransactionType.moneyAccountDeposit,
      ]))
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

type MmPayEntryPoint =
  | 'money_account'
  | 'perps'
  | 'predict'
  | 'money_hub'
  | 'activity';

const ENTRY_POINT_MAP: [TransactionType[], MmPayEntryPoint][] = [
  [
    [
      TransactionType.perpsDeposit,
      TransactionType.perpsDepositAndOrder,
      TransactionType.perpsWithdraw,
    ],
    'perps',
  ],
  [
    [
      TransactionType.predictDeposit,
      TransactionType.predictDepositAndOrder,
      TransactionType.predictWithdraw,
    ],
    'predict',
  ],
  [
    [TransactionType.moneyAccountDeposit, TransactionType.moneyAccountWithdraw],
    'money_account',
  ],
  [[TransactionType.musdConversion], 'money_hub'],
];

function getEntryPoint(
  transactionMeta: Parameters<typeof hasTransactionType>[0],
): MmPayEntryPoint | undefined {
  for (const [types, entryPoint] of ENTRY_POINT_MAP) {
    if (hasTransactionType(transactionMeta, types)) {
      return entryPoint;
    }
  }
  return undefined;
}
