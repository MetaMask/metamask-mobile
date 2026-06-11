/* eslint-disable @typescript-eslint/naming-convention */
import React, { useMemo } from 'react';
import Text, {
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import { Box } from '../../../../../UI/Box/Box';
import {
  selectTransactionsByBatchId,
  selectTransactionsByIds,
} from '../../../../../../selectors/transactionController';
import { useSelector } from 'react-redux';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { RootState } from '../../../../../../reducers';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { hasTransactionType } from '../../../utils/transaction';
import { RELAY_DEPOSIT_TYPES } from '../../../constants/confirmations';
import { ProgressList } from '../../progress-list';
import { SourceHashSummaryLine } from './source-hash-summary-line';
import { DepositSummaryLine } from './deposit-summary-line';
import { ApprovalSummaryLine } from './approval-summary-line';
import { ReceiveSummaryLine } from './receive-summary-line';
import { DefaultSummaryLine } from './default-summary-line';
import { FiatOrderSummaryLine } from './fiat-order-summary-line';
import { strings } from '../../../../../../../locales/i18n';

export function TransactionDetailsSummary() {
  const { transactionMeta } = useTransactionDetails();
  const {
    batchId,
    id: transactionId,
    metamaskPay,
    requiredTransactionIds,
  } = transactionMeta;

  const batchTransactions = useSelector((state: RootState) =>
    selectTransactionsByBatchId(state, batchId ?? ''),
  );

  const batchTransactionIds = useMemo(
    () =>
      batchTransactions
        .filter((transaction) => transaction.id !== transactionId)
        .map((transaction) => transaction.id),
    [batchTransactions, transactionId],
  );

  const transactionIds = useMemo(
    () => [
      ...(requiredTransactionIds ?? []),
      ...(batchTransactionIds ?? []),
      transactionId,
    ],
    [requiredTransactionIds, batchTransactionIds, transactionId],
  );

  const allTransactions = useSelector((state: RootState) =>
    selectTransactionsByIds(state, transactionIds),
  );

  const transactions = allTransactions.filter(
    (transaction) =>
      !isSkippedTransaction(transaction, transactionMeta) ||
      transaction.id === transactionId,
  );

  const hasDepositTransactions =
    (requiredTransactionIds?.length ?? 0) > 0 || batchTransactionIds.length > 0;

  const { sourceHash, fiat } = metamaskPay ?? {};
  const { orderId: fiatOrderId } = fiat ?? {};

  const isMoneyAccountFlow = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountDeposit,
    TransactionType.moneyAccountWithdraw,
  ]);

  const showSourceHash = !hasDepositTransactions && sourceHash;

  return (
    <Box gap={12}>
      <Text color={TextColor.Alternative}>
        {isMoneyAccountFlow
          ? strings('transaction_details.label.steps_completed', {
              count: getCompletedCount({
                transactions,
                transactionMeta,
                hasFiatOrder: Boolean(fiatOrderId),
                hasSourceHash: Boolean(showSourceHash),
              }).toString(),
            })
          : strings('transaction_details.label.summary')}
      </Text>
      <ProgressList showConnectors={false}>
        {fiatOrderId ? (
          <FiatOrderSummaryLine parentTransaction={transactionMeta} />
        ) : null}
        {showSourceHash ? (
          <SourceHashSummaryLine
            parentTransaction={transactionMeta}
            sourceHash={sourceHash}
          />
        ) : null}
        {transactions.map((transaction) => (
          <SummaryLine
            key={transaction.id}
            transactionMeta={transaction}
            parentTransaction={transactionMeta}
          />
        ))}
      </ProgressList>
    </Box>
  );
}

function SummaryLine({
  transactionMeta,
  parentTransaction,
}: {
  transactionMeta: TransactionMeta;
  parentTransaction: TransactionMeta;
}) {
  if (hasTransactionType(transactionMeta, RELAY_DEPOSIT_TYPES)) {
    return (
      <DepositSummaryLine
        transactionMeta={transactionMeta}
        parentTransaction={parentTransaction}
      />
    );
  }

  if (transactionMeta.type === TransactionType.tokenMethodApprove) {
    return <ApprovalSummaryLine transactionMeta={transactionMeta} />;
  }

  if (
    hasTransactionType(transactionMeta, [
      TransactionType.moneyAccountDeposit,
      TransactionType.perpsDeposit,
      TransactionType.predictDeposit,
      TransactionType.musdConversion,
      TransactionType.predictWithdraw,
    ])
  ) {
    return <ReceiveSummaryLine transactionMeta={transactionMeta} />;
  }

  return <DefaultSummaryLine transactionMeta={transactionMeta} />;
}

function isSkippedTransaction(
  transaction: TransactionMeta,
  parentTransaction: TransactionMeta,
): boolean {
  return (
    hasTransactionType(parentTransaction, [TransactionType.musdConversion]) &&
    !hasTransactionType(transaction, [TransactionType.relayDeposit])
  );
}

function getCompletedCount({
  transactions,
  transactionMeta,
  hasFiatOrder,
  hasSourceHash,
}: {
  transactions: TransactionMeta[];
  transactionMeta: TransactionMeta;
  hasFiatOrder: boolean;
  hasSourceHash: boolean;
}): number {
  const totalSteps =
    transactions.length + (hasFiatOrder ? 1 : 0) + (hasSourceHash ? 1 : 0);
  const confirmedTxCount = transactions.filter(
    (tx) => tx.status === TransactionStatus.confirmed,
  ).length;
  const isParentConfirmed =
    transactionMeta.status === TransactionStatus.confirmed;
  const completedCount =
    confirmedTxCount +
    (hasFiatOrder && isParentConfirmed ? 1 : 0) +
    (hasSourceHash && isParentConfirmed ? 1 : 0);
  return Math.min(completedCount, totalSteps);
}
