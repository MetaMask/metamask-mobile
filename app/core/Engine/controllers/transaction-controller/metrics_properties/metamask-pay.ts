import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { TransactionMetrics, TransactionMetricsBuilder } from '../types';
import { JsonMap } from '../../../../../util/analytics/analytics.types';
import { NATIVE_TOKEN_ADDRESS } from '../../../../../components/Views/confirmations/constants/tokens';
import { hasTransactionType } from '../../../../../components/Views/confirmations/utils/transaction';
import {
  getMetaMaskPayFiatChainTarget,
  normalizeMetaMaskPayPaymentMethod,
} from '../../../../../components/Views/confirmations/utils/transaction-pay-metrics';
import { TransactionPayStrategy } from '@metamask/transaction-pay-controller';
import { RootState } from '../../../../../reducers';
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

export const getMetaMaskPayProperties: TransactionMetricsBuilder = ({
  eventType,
  transactionMeta,
  allTransactions,
  getUIMetrics,
  getState,
}) => {
  const properties: JsonMap = {};
  const sensitiveProperties: JsonMap = {};
  const { id: transactionId, type } = transactionMeta;
  const isPayType = hasTransactionType(transactionMeta, PAY_TYPES);

  const parentTransaction = allTransactions.find((tx) =>
    tx.requiredTransactionIds?.includes(transactionId),
  );

  if (
    hasTransactionType(transactionMeta, [
      TransactionType.predictDeposit,
      TransactionType.predictDepositAndOrder,
    ])
  ) {
    properties.polymarket_account_created = (
      transactionMeta?.nestedTransactions ?? []
    ).some((t) => t.data?.startsWith(FOUR_BYTE_SAFE_PROXY_CREATE));
  }

  if (isPayType || !parentTransaction) {
    addPayTypeProperties(properties, transactionMeta, getState());

    if (isPayType || properties.mm_pay) {
      addTimeToComplete(
        properties,
        eventType,
        transactionMeta,
        allTransactions,
      );
    }

    return {
      properties,
      sensitiveProperties,
    };
  }

  addPayTypeProperties(properties, parentTransaction, getState());
  addParentPaymentMethodUIMetrics(
    properties,
    getUIMetrics(parentTransaction.id),
  );

  const relatedTransactionIds = parentTransaction.requiredTransactionIds ?? [];

  properties.mm_pay_transaction_step =
    relatedTransactionIds.indexOf(transactionId) + 1;

  if (
    [TransactionType.bridge, TransactionType.swap].includes(
      type as TransactionType,
    )
  ) {
    const quotes =
      getState().engine.backgroundState.TransactionPayController
        .transactionData[parentTransaction.id]?.quotes ?? [];

    const quoteTransactionIds = relatedTransactionIds.filter((id) =>
      allTransactions.some(
        (tx) =>
          tx.id === id &&
          [TransactionType.bridge, TransactionType.swap].includes(
            tx.type as TransactionType,
          ),
      ),
    );

    const quoteIndex = quoteTransactionIds.indexOf(transactionMeta.id);
    const quote = quotes[quoteIndex];

    if (quote && quote.request.targetTokenAddress !== NATIVE_TOKEN_ADDRESS) {
      properties.mm_pay_dust_usd = quote.dust.usd;
    }
  }

  return {
    properties,
    sensitiveProperties,
  };
};

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
  if (eventType !== TRANSACTION_EVENTS.TRANSACTION_FINALIZED) {
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
 * Derives mm_pay_* properties from controller state for PAY_TYPE transactions.
 * Uses transactionMeta.metamaskPay and TransactionPayController.transactionData
 * as the single source of truth, independent of UI hook lifecycle.
 */
function addPayTypeProperties(
  properties: JsonMap,
  transaction: TransactionMeta,
  state: RootState,
) {
  const { metamaskPay, id: transactionId } = transaction;

  if (
    !metamaskPay?.chainId ||
    !metamaskPay?.tokenAddress ||
    properties.mm_pay
  ) {
    return;
  }

  const { chainId, tokenAddress } = metamaskPay;

  properties.mm_pay = true;
  properties.mm_pay_chain_selected = chainId;
  properties.mm_pay_payment_method_selected = 'crypto';

  const txPayData =
    state.engine.backgroundState.TransactionPayController?.transactionData?.[
      transactionId
    ];

  properties.mm_pay_token_selected =
    txPayData?.paymentToken?.symbol ??
    getTokenSymbol(state, chainId, tokenAddress);

  for (const [types, useCase] of USE_CASE_MAP) {
    if (hasTransactionType(transaction, types)) {
      properties.mm_pay_use_case = useCase;
      break;
    }
  }

  if (!txPayData) {
    return;
  }

  const { quotes, totals, tokens } = txPayData;
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

  const strategy = quotes?.[0]?.strategy;

  if (strategy === TransactionPayStrategy.Relay) {
    properties.mm_pay_strategy = 'relay';
  } else if (strategy === TransactionPayStrategy.Fiat) {
    properties.mm_pay_strategy = 'fiat';
  }

  properties.mm_pay_transaction_step_total = (quotes?.length ?? 0) + 1;
  properties.mm_pay_transaction_step = properties.mm_pay_transaction_step_total;

  const fiatPayment = txPayData.fiatPayment;
  const selectedPaymentMethodId = fiatPayment?.selectedPaymentMethodId;

  if (selectedPaymentMethodId) {
    properties.mm_pay_payment_method_selected =
      normalizeMetaMaskPayPaymentMethod(selectedPaymentMethodId);

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
