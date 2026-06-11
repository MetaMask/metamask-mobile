/* eslint-disable @typescript-eslint/naming-convention */
import React from 'react';
import { TransactionStatus ,
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import Text, {
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import { Box } from '../../../../../UI/Box/Box';
import { hasTransactionType } from '../../../utils/transaction';
import { RELAY_DEPOSIT_TYPES } from '../../../constants/confirmations';
import { ProgressList } from '../../progress-list';
import { SourceHashSummaryLine } from './source-hash-summary-line';
import { DepositSummaryLine } from './deposit-summary-line';
import { ApprovalSummaryLine } from './approval-summary-line';
import { ReceiveSummaryLine } from './receive-summary-line';
import { DefaultSummaryLine } from './default-summary-line';
import { FiatOrderSummaryLine } from './fiat-order-summary-line';
import { useSummaryTransactions } from '../../../hooks/activity/useSummaryTransactions';
import { strings } from '../../../../../../../locales/i18n';

export function TransactionDetailsSummary() {
  const {
    transactionMeta,
    transactions,
    hasDepositTransactions,
    sourceHash,
    fiatOrderId,
  } = useSummaryTransactions();

  const hasFiatOrder = Boolean(fiatOrderId);
  const hasSourceHash = !hasDepositTransactions && Boolean(sourceHash);
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

  return (
    <Box gap={12}>
      <Text color={TextColor.Alternative}>
        {strings('transaction_details.label.steps_completed', {
          count: Math.min(completedCount, totalSteps).toString(),
        })}
      </Text>
      <ProgressList>
        {fiatOrderId ? (
          <FiatOrderSummaryLine parentTransaction={transactionMeta} />
        ) : null}
        {hasSourceHash ? (
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
