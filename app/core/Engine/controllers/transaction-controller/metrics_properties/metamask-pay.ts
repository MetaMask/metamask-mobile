import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { TransactionMetricsBuilder } from '../types';
import { JsonMap } from '../../../../../util/analytics/analytics.types';
import { NATIVE_TOKEN_ADDRESS } from '../../../../../components/Views/confirmations/constants/tokens';
import { hasTransactionType } from '../../../../../components/Views/confirmations/utils/transaction';
import {
  TransactionPayBridgeQuote,
  TransactionPayQuote,
  TransactionPayStrategy,
} from '@metamask/transaction-pay-controller';
import { RootState } from '../../../../../reducers';
import { selectSingleTokenByAddressAndChainId } from '../../../../../selectors/tokensController';
import { Hex } from '@metamask/utils';
import { TRANSACTION_EVENTS } from '../../../../Analytics/events/confirmations';
import { BigNumber } from 'bignumber.js';

const FOUR_BYTE_SAFE_PROXY_CREATE = '0xa1884d2c';

const PAY_TYPES = [
  TransactionType.perpsDeposit,
  TransactionType.perpsWithdraw,
  TransactionType.predictDeposit,
  TransactionType.predictWithdraw,
];

const USE_CASE_MAP: [TransactionType[], string][] = [
  [[TransactionType.predictWithdraw], 'predict_withdraw'],
  [[TransactionType.predictDeposit], 'predict_deposit'],
  [[TransactionType.perpsDeposit], 'perps_deposit'],
  [[TransactionType.perpsWithdraw], 'perps_withdraw'],
];

export const getMetaMaskPayProperties: TransactionMetricsBuilder = ({
  eventType,
  transactionMeta,
  allTransactions,
  getState,
}) => {
  const properties: JsonMap = {};
  const sensitiveProperties: JsonMap = {};
  const { id: transactionId, type } = transactionMeta;
  const isPayType = hasTransactionType(transactionMeta, PAY_TYPES);

  const parentTransaction = allTransactions.find((tx) =>
    tx.requiredTransactionIds?.includes(transactionId),
  );

  if (hasTransactionType(transactionMeta, [TransactionType.predictDeposit])) {
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

    if (quote?.strategy === TransactionPayStrategy.Bridge) {
      const bridgeQuote =
        quote as TransactionPayQuote<TransactionPayBridgeQuote>;

      const metrics = bridgeQuote.original.metrics;

      properties.mm_pay_quotes_attempts = metrics?.attempts;
      properties.mm_pay_quotes_buffer_size = metrics?.buffer;
      properties.mm_pay_quotes_latency = metrics?.latency;
      properties.mm_pay_bridge_provider = bridgeQuote.original.quote.bridgeId;
    }

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

  const submittedTime = getLatestChildSubmittedTime(
    transactionMeta,
    allTransactions,
  );

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

  if (strategy === TransactionPayStrategy.Bridge) {
    properties.mm_pay_strategy = 'mm_swaps_bridge';
  } else if (strategy === TransactionPayStrategy.Relay) {
    properties.mm_pay_strategy = 'relay';
  }

  properties.mm_pay_transaction_step_total = (quotes?.length ?? 0) + 1;
  properties.mm_pay_transaction_step = properties.mm_pay_transaction_step_total;
}

function getTokenSymbol(state: RootState, chainId: Hex, tokenAddress: Hex) {
  const token = selectSingleTokenByAddressAndChainId(
    state,
    tokenAddress,
    chainId,
  );

  return token?.symbol;
}
