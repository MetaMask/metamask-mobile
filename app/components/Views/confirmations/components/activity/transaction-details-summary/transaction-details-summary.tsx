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
  TransactionType,
} from '@metamask/transaction-controller';
import { hasTransactionType } from '../../../utils/transaction';
import { RELAY_DEPOSIT_TYPES } from '../../../constants/confirmations';
import { ProgressList } from '../../progress-list';
import { DepositSummaryLine } from './deposit-summary-line';
import { ApprovalSummaryLine } from './approval-summary-line';
import { ReceiveSummaryLine } from './receive-summary-line';
import { DefaultSummaryLine } from './default-summary-line';

export function TransactionDetailsSummary() {
  const { transactionMeta } = useTransactionDetails();
  const {
    batchId,
    id: transactionId,
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

  return (
    <Box gap={12}>
      <Text color={TextColor.Alternative}>Summary</Text>
      <ProgressList>
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
  // Relay deposit types render as send lines
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
      TransactionType.perpsDeposit,
      TransactionType.predictDeposit,
      TransactionType.musdConversion,
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
