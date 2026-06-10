/* eslint-disable @typescript-eslint/naming-convention */
import React from 'react';
import Text, {
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import { Box } from '../../../../../UI/Box/Box';
import {
  TransactionMeta,
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
import { useSummaryTransactions } from '../../../hooks/activity/useSummaryTransactions';

export function TransactionDetailsSummary() {
  const {
    transactionMeta,
    transactions,
    hasDepositTransactions,
    sourceHash,
    fiatOrderId,
  } = useSummaryTransactions();

  return (
    <Box gap={12}>
      <Text color={TextColor.Alternative}>Summary</Text>
      <ProgressList>
        {fiatOrderId ? (
          <FiatOrderSummaryLine parentTransaction={transactionMeta} />
        ) : null}
        {!hasDepositTransactions && sourceHash ? (
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
