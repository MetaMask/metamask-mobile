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
import { useIsMoneyAccountContext } from '../../../hooks/activity/useIsMoneyAccountContext';
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
  const isMoneyContext = useIsMoneyAccountContext();
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

  const showSourceHash = !hasDepositTransactions && sourceHash;

  const txCompletedCount = transactions.filter(
    (tx) => tx.status === TransactionStatus.confirmed,
  ).length;

  const parentConfirmed =
    transactionMeta.status === TransactionStatus.confirmed;

  // fiatOrderId (fiat deposits) and showSourceHash (perps/predict via polymarket)
  // are mutually exclusive — at most one extra completed step applies.
  const hasExtraCompletedStep =
    parentConfirmed && (Boolean(fiatOrderId) || showSourceHash);

  const completedCount = txCompletedCount + (hasExtraCompletedStep ? 1 : 0);

  const hasMultipleSteps =
    transactions.length > 1 || Boolean(fiatOrderId) || Boolean(showSourceHash);

  let heading: string | undefined;

  if (!isMoneyContext) {
    heading = strings('transaction_details.label.summary');
  } else if (hasMultipleSteps) {
    heading = strings('transaction_details.label.steps_completed', {
      count: completedCount,
    });
  }

  return (
    <Box gap={12}>
      {heading ? <Text color={TextColor.Alternative}>{heading}</Text> : null}
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
      TransactionType.perpsWithdraw,
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
    !hasTransactionType(transaction, RELAY_DEPOSIT_TYPES)
  );
}
