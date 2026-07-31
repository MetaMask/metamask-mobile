import {
  TransactionMeta,
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { TransactionMetrics, TransactionMetricsBuilder } from '../types';
import { JsonMap } from '../../../../../util/analytics/analytics.types';
import { NATIVE_TOKEN_ADDRESS } from '../../../../../components/Views/confirmations/constants/tokens';
import {
  getMetaMaskPayFiatChainTarget,
  normalizeMetaMaskPayPaymentMethod,
} from '../../../../../components/Views/confirmations/utils/transaction-pay-metrics';
import { TransactionPayStrategy } from '@metamask/transaction-pay-controller';
import { RootState } from '../../../../../reducers';
import { isNoOpQuote } from '../../../../../selectors/transactionPayController';
import { selectRampsOrders } from '../../../../../selectors/rampsController';
import { selectSingleTokenByAddressAndChainId } from '../../../../../selectors/tokensController';
import { Hex } from '@metamask/utils';
import { TRANSACTION_EVENTS } from '../../../../Analytics/events/confirmations';
import { BigNumber } from 'bignumber.js';

const FOUR_BYTE_SAFE_PROXY_CREATE = '0xa1884d2c';

const PAY_TYPES = [
  TransactionType.moneyAccountDeposit,
  TransactionType.moneyAccountWithdraw,
  TransactionType.perpsDeposit,
  TransactionType.perpsWithdraw,
  TransactionType.predictDeposit,
  TransactionType.predictDepositAndOrder,
  TransactionType.predictWithdraw,
];

const USE_CASE_MAP: [TransactionType[], string][] = [
  [[TransactionType.predictWithdraw], 'predict_withdraw'],
  [[TransactionType.predictDeposit], 'predict_deposit'],
  [[TransactionType.predictDepositAndOrder], 'predict_deposit_and_order'],
  [[TransactionType.perpsDeposit], 'perps_deposit'],
  [[TransactionType.perpsWithdraw], 'perps_withdraw'],
  [[TransactionType.moneyAccountDeposit], 'money_account_deposit'],
  [[TransactionType.moneyAccountWithdraw], 'money_account_withdraw'],
];

const UI_PAYMENT_METHOD_PROPERTIES = [
  'mm_pay_payment_method_available',
  'mm_pay_payment_method_presented',
] as const;

type TransactionPayData =
  RootState['engine']['backgroundState']['TransactionPayController']['transactionData'][string];

export const getMetaMaskPayProperties: TransactionMetricsBuilder = ({
  eventType,
  transactionMeta,
  allTransactions,
  getUIMetrics,
  getState,
}) => {
  const properties: JsonMap = {};
  const sensitiveProperties: JsonMap = {};
  const state = getState();

  const parentTransaction = hasTransactionType(transactionMeta, PAY_TYPES)
    ? undefined
    : allTransactions.find((tx) =>
        tx.requiredTransactionIds?.includes(transactionMeta.id),
      );

  const payTransaction = parentTransaction ?? transactionMeta;
  const txPayData = getTransactionPayData(state, payTransaction.id);

  // polymarket_account_created
  addPolymarketAccountCreated(properties, transactionMeta);

  if (isPayTransaction(payTransaction)) {
    // mm_pay, mm_pay_payment_method_selected, mm_pay_chain_selected,
    // mm_pay_token_selected, mm_pay_use_case
    addBaselinePayProperties(properties, {
      transaction: payTransaction,
      txPayData,
      state,
    });

    if (txPayData) {
      // mm_pay_sending_value_usd, mm_pay_receiving_value_usd,
      // mm_pay_metamask_fee_usd, mm_pay_provider_fee_usd, mm_pay_network_fee_usd
      addAmountProperties(properties, txPayData);

      // mm_pay_quote_skipped, mm_pay_strategy,
      // mm_pay_transaction_step, mm_pay_transaction_step_total
      addQuoteProperties(properties, txPayData);

      // mm_pay_payment_method_selected, mm_pay_fiat_provider,
      // mm_pay_fiat_token_target, mm_pay_fiat_chain_target
      addFiatPaymentProperties(properties, txPayData);
    } else {
      // mm_pay_receiving_value_usd, mm_pay_provider_fee_usd,
      // mm_pay_network_fee_usd, mm_pay_strategy, mm_pay_fiat_provider,
      // mm_pay_payment_method_selected
      addPersistedPayMetadata(properties, payTransaction, state);
    }
  }

  if (parentTransaction) {
    // mm_pay_payment_method_available, mm_pay_payment_method_presented
    addParentPaymentMethodUIMetrics(
      properties,
      getUIMetrics(parentTransaction.id),
    );

    // mm_pay_transaction_step
    addChildTransactionStep(properties, transactionMeta, parentTransaction);

    // mm_pay_dust_usd
    addDustProperties(properties, {
      transactionMeta,
      parentTransaction,
      allTransactions,
      txPayData,
    });
  } else {
    // mm_pay_time_to_complete_s
    addTimeToComplete(properties, eventType, transactionMeta, allTransactions);
  }

  return { properties, sensitiveProperties };
};

function isPayTransaction(transaction: TransactionMeta): boolean {
  const { metamaskPay } = transaction;

  return (
    hasTransactionType(transaction, PAY_TYPES) ||
    Boolean(metamaskPay?.chainId && metamaskPay?.tokenAddress)
  );
}

function addPolymarketAccountCreated(
  properties: JsonMap,
  transactionMeta: TransactionMeta,
) {
  if (
    !hasTransactionType(transactionMeta, [
      TransactionType.predictDeposit,
      TransactionType.predictDepositAndOrder,
    ])
  ) {
    return;
  }

  properties.polymarket_account_created = (
    transactionMeta?.nestedTransactions ?? []
  ).some((t) => t.data?.startsWith(FOUR_BYTE_SAFE_PROXY_CREATE));
}

function addChildTransactionStep(
  properties: JsonMap,
  transactionMeta: TransactionMeta,
  parentTransaction: TransactionMeta,
) {
  const relatedTransactionIds = parentTransaction.requiredTransactionIds ?? [];

  properties.mm_pay_transaction_step =
    relatedTransactionIds.indexOf(transactionMeta.id) + 1;
}

function addDustProperties(
  properties: JsonMap,
  {
    transactionMeta,
    parentTransaction,
    allTransactions,
    txPayData,
  }: {
    transactionMeta: TransactionMeta;
    parentTransaction: TransactionMeta;
    allTransactions: TransactionMeta[];
    txPayData: TransactionPayData | undefined;
  },
) {
  if (!isSwapOrBridge(transactionMeta.type)) {
    return;
  }

  const quotes = txPayData?.quotes ?? [];

  const relatedTransactionIds = parentTransaction.requiredTransactionIds ?? [];

  const quoteTransactionIds = relatedTransactionIds.filter((id) =>
    allTransactions.some((tx) => tx.id === id && isSwapOrBridge(tx.type)),
  );

  const quoteIndex = quoteTransactionIds.indexOf(transactionMeta.id);
  const quote = quotes[quoteIndex];

  if (quote && quote.request.targetTokenAddress !== NATIVE_TOKEN_ADDRESS) {
    properties.mm_pay_dust_usd = quote.dust.usd;
  }
}

function getLatestChildSubmittedTime(
  transactionMeta: TransactionMeta,
  allTransactions: TransactionMeta[],
): number | undefined {
  const { requiredTransactionIds } = transactionMeta;

  const submittedTimes = allTransactions
    .filter((tx) => requiredTransactionIds?.includes(tx.id))
    .map((tx) => tx.submittedTime)
    .filter((t): t is number => typeof t === 'number');

  return submittedTimes.length > 0 ? Math.max(...submittedTimes) : undefined;
}

function addTimeToComplete(
  properties: JsonMap,
  eventType: Parameters<TransactionMetricsBuilder>[0]['eventType'],
  transactionMeta: TransactionMeta,
  allTransactions: TransactionMeta[],
) {
  if (
    !properties.mm_pay ||
    eventType !== TRANSACTION_EVENTS.TRANSACTION_FINALIZED
  ) {
    return;
  }

  const submittedTime =
    getLatestChildSubmittedTime(transactionMeta, allTransactions) ??
    transactionMeta.submittedTime;

  if (typeof submittedTime !== 'number') {
    return;
  }

  properties.mm_pay_time_to_complete_s =
    Math.round(Date.now() - submittedTime) / 1000;
}

/**
 * Backfills mm_pay_* properties from the persisted transactionMeta.metamaskPay
 * when the non-persisted TransactionPayController.transactionData is no longer
 * available, e.g. after the app restarted mid-flight.
 */
function addPersistedPayMetadata(
  properties: JsonMap,
  transaction: TransactionMeta,
  state: RootState,
) {
  const { metamaskPay } = transaction;

  if (!metamaskPay) {
    return;
  }

  const { bridgeFeeFiat, fiat, networkFeeFiat, targetFiat } = metamaskPay;

  if (targetFiat !== undefined) {
    properties.mm_pay_receiving_value_usd = Number(targetFiat);
  }

  if (bridgeFeeFiat !== undefined) {
    properties.mm_pay_provider_fee_usd = bridgeFeeFiat;
  }

  if (networkFeeFiat !== undefined) {
    properties.mm_pay_network_fee_usd = networkFeeFiat;
  }

  if (!fiat) {
    // Non-fiat strategy is not persisted on metamaskPay yet, so assume the
    // most common one until the strategy is persisted in TransactionController
    // state.
    properties.mm_pay_strategy = 'relay';
    return;
  }

  properties.mm_pay_strategy = 'fiat';

  const providerCode = extractFiatProviderCode(fiat.provider);

  if (providerCode) {
    properties.mm_pay_fiat_provider = providerCode;
  }

  const paymentMethodId = selectRampsOrders(state).find(
    (order) => order.providerOrderId === fiat.orderId,
  )?.paymentMethod?.id;

  if (paymentMethodId) {
    properties.mm_pay_payment_method_selected =
      normalizeMetaMaskPayPaymentMethod(paymentMethodId);
  }
}

function addBaselinePayProperties(
  properties: JsonMap,
  {
    transaction,
    txPayData,
    state,
  }: {
    transaction: TransactionMeta;
    txPayData: TransactionPayData | undefined;
    state: RootState;
  },
) {
  const { metamaskPay } = transaction;
  const chainId = metamaskPay?.chainId;
  const tokenAddress = metamaskPay?.tokenAddress;

  properties.mm_pay = true;
  properties.mm_pay_payment_method_selected = 'crypto';

  if (chainId) {
    properties.mm_pay_chain_selected = chainId;
  }

  const tokenSymbol =
    txPayData?.paymentToken?.symbol ??
    (chainId && tokenAddress
      ? getTokenSymbol(state, chainId, tokenAddress)
      : undefined);

  if (tokenSymbol !== undefined) {
    properties.mm_pay_token_selected = tokenSymbol;
  }

  for (const [types, useCase] of USE_CASE_MAP) {
    if (hasTransactionType(transaction, types)) {
      properties.mm_pay_use_case = useCase;
      break;
    }
  }
}

function addAmountProperties(
  properties: JsonMap,
  txPayData: TransactionPayData,
) {
  const { totals, tokens } = txPayData;

  const primaryRequiredToken = tokens?.find(
    (t: { skipIfBalance: boolean }) => !t.skipIfBalance,
  );

  if (primaryRequiredToken) {
    properties.mm_pay_sending_value_usd = Number(
      primaryRequiredToken.amountUsd ?? '0',
    );
  }

  if (totals) {
    properties.mm_pay_receiving_value_usd = Number(totals.targetAmount.usd);
    properties.mm_pay_metamask_fee_usd = Number(totals.fees.metaMask.usd);
    properties.mm_pay_provider_fee_usd = totals.fees.provider.usd;
    properties.mm_pay_network_fee_usd = new BigNumber(
      totals.fees.sourceNetwork.estimate.usd,
    )
      .plus(totals.fees.targetNetwork.usd)
      .toString(10);
  }
}

function addQuoteProperties(
  properties: JsonMap,
  txPayData: TransactionPayData,
) {
  // No-op quotes mark routes the controller validated as needing no
  // conversion. They are not executable, so strategy and step totals must
  // only count real quotes.
  const quotes = (txPayData.quotes ?? []).filter(
    (quote) => !isNoOpQuote(quote),
  );

  properties.mm_pay_quote_skipped =
    (txPayData.quotes ?? []).length > quotes.length;

  const strategy = quotes[0]?.strategy;

  if (strategy === TransactionPayStrategy.Relay) {
    properties.mm_pay_strategy = 'relay';
  } else if (strategy === TransactionPayStrategy.Fiat) {
    properties.mm_pay_strategy = 'fiat';
  }

  properties.mm_pay_transaction_step_total = quotes.length + 1;
  properties.mm_pay_transaction_step = properties.mm_pay_transaction_step_total;
}

function addFiatPaymentProperties(
  properties: JsonMap,
  txPayData: TransactionPayData,
) {
  const fiatPayment = txPayData.fiatPayment;
  const selectedPaymentMethodId = fiatPayment?.selectedPaymentMethodId;

  if (!selectedPaymentMethodId) {
    return;
  }

  properties.mm_pay_payment_method_selected = normalizeMetaMaskPayPaymentMethod(
    selectedPaymentMethodId,
  );

  if (fiatPayment?.rampsQuote) {
    const providerCode = extractFiatProviderCode(
      fiatPayment.rampsQuote.provider,
    );

    if (providerCode) {
      properties.mm_pay_fiat_provider = providerCode;
    }

    const fiatTokenTargetSymbol =
      fiatPayment.rampsQuote.quote.cryptoTranslation?.symbol;

    if (fiatTokenTargetSymbol) {
      properties.mm_pay_fiat_token_target = fiatTokenTargetSymbol;
    }
  }

  const fiatChainTarget = getMetaMaskPayFiatChainTarget({
    caipAssetId: fiatPayment?.caipAssetId,
    chainId: fiatPayment?.rampsQuote?.quote.cryptoTranslation?.chainId,
  });

  if (fiatChainTarget) {
    properties.mm_pay_fiat_chain_target = fiatChainTarget;
  }
}

function getTransactionPayData(
  state: RootState,
  transactionId: string,
): TransactionPayData | undefined {
  return state?.engine?.backgroundState?.TransactionPayController
    ?.transactionData?.[transactionId];
}

function isSwapOrBridge(type: TransactionType | undefined): boolean {
  return [TransactionType.bridge, TransactionType.swap].includes(
    type as TransactionType,
  );
}

function getTokenSymbol(state: RootState, chainId: Hex, tokenAddress: Hex) {
  const token = selectSingleTokenByAddressAndChainId(
    state,
    tokenAddress,
    chainId,
  );

  return token?.symbol;
}

function addParentPaymentMethodUIMetrics(
  properties: JsonMap,
  parentMetrics: TransactionMetrics | undefined,
) {
  for (const property of UI_PAYMENT_METHOD_PROPERTIES) {
    const value = parentMetrics?.properties?.[property];

    if (value !== undefined) {
      properties[property] = value;
    }
  }
}

/**
 * Extracts the provider code from a Ramps provider string.
 *
 * Accepts the canonical provider code (e.g. `transak-native`) and, for
 * backwards compatibility, the legacy path form (e.g. `/providers/transak-native`).
 *
 * @param provider - Canonical provider code, or legacy provider path.
 * @returns The provider code, or `null` if the format is invalid.
 */
function extractFiatProviderCode(provider: string | undefined): string | null {
  if (!provider) {
    return null;
  }

  const parts = provider.split('/').filter(Boolean);

  if (parts[0] === 'providers') {
    return parts[1] ?? null;
  }

  return parts.length === 1 ? parts[0] : null;
}
