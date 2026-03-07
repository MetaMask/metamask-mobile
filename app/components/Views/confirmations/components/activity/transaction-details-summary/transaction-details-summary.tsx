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
import { RelayDepositSummaryLine } from './relay-deposit-summary-line';
import { ApprovalSummaryLine } from './approval-summary-line';
import { ReceiveSummaryLine } from './receive-summary-line';
import { DefaultSummaryLine } from './default-summary-line';
import { PayTokenInfo } from './types';

export type { PayTokenInfo } from './types';

export function TransactionDetailsSummary() {
  const { transactionMeta } = useTransactionDetails();
  const {
    batchId,
    id: transactionId,
    requiredTransactionIds,
    metamaskPay,
  } = transactionMeta;

  const batchTransactions = useSelector((state: RootState) =>
    selectTransactionsByBatchId(state, batchId ?? ''),
  );

  const batchTransactionIds = batchTransactions
    .filter((transaction) => transaction.id !== transactionId)
    .map((transaction) => transaction.id);

  const transactionIds = useMemo(
    () => [
      ...(requiredTransactionIds ?? []),
      ...(batchTransactionIds ?? []),
      transactionId,
    ],
    [requiredTransactionIds, batchTransactionIds, transactionId],
  );

  const transactions = useSelector((state: RootState) =>
    selectTransactionsByIds(state, transactionIds),
  );

  const payTokenInfo: PayTokenInfo = {
    tokenAddress: metamaskPay?.tokenAddress,
    chainId: metamaskPay?.chainId,
  };

  return (
    <Box gap={12}>
      <Text color={TextColor.Alternative}>Summary</Text>
      <ProgressList>
        {transactions.map((transaction) => (
          <TransactionSummaryLine
            key={transaction.id}
            transactionMeta={transaction}
            parentTransaction={transactionMeta}
            payTokenInfo={payTokenInfo}
          />
        ))}
      </ProgressList>
    </Box>
  );
}

function TransactionSummaryLine({
  transactionMeta,
  parentTransaction,
  payTokenInfo,
}: {
  transactionMeta: TransactionMeta;
  parentTransaction: TransactionMeta;
  payTokenInfo: PayTokenInfo;
}) {
  // Relay deposit types render as send lines
  if (hasTransactionType(transactionMeta, RELAY_DEPOSIT_TYPES)) {
    return (
      <RelayDepositSummaryLine
        transactionMeta={transactionMeta}
        parentTransaction={parentTransaction}
        payTokenInfo={payTokenInfo}
      />
    );
  }

  if (transactionMeta.type === TransactionType.tokenMethodApprove) {
    return <ApprovalSummaryLine transactionMeta={transactionMeta} />;
  }

  // Receive-only types: perpsDeposit, predictDeposit, musdConversion, musdClaim
  if (
    hasTransactionType(transactionMeta, [
      TransactionType.perpsDeposit,
      TransactionType.predictDeposit,
      TransactionType.musdConversion,
      TransactionType.musdClaim,
    ])
  ) {
    return <ReceiveSummaryLine transactionMeta={transactionMeta} />;
  }

  // mUSD conversion child transactions that aren't relay deposits are skipped
  if (
    hasTransactionType(parentTransaction, [TransactionType.musdConversion]) &&
    !hasTransactionType(transactionMeta, [TransactionType.relayDeposit])
  ) {
    return null;
  }

  return <DefaultSummaryLine transactionMeta={transactionMeta} />;
}
