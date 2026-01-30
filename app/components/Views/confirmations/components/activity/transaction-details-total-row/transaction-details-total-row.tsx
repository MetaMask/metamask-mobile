import React, { useMemo } from 'react';
import { TransactionDetailsRow } from '../transaction-details-row/transaction-details-row';
import Text from '../../../../../../component-library/components/Texts/Text';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { strings } from '../../../../../../../locales/i18n';
import { useTokenAmount } from '../../../hooks/useTokenAmount';
import { TransactionType } from '@metamask/transaction-controller';
import { hasTransactionType } from '../../../utils/transaction';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { BigNumber } from 'bignumber.js';
import { TransactionDetailsSelectorIDs } from '../TransactionDetailsModal.testIds';

const FALLBACK_TYPES = [
  TransactionType.musdClaim,
  TransactionType.predictWithdraw,
];

export function TransactionDetailsTotalRow() {
  const formatFiat = useFiatFormatter({ currency: 'usd' });
  const { transactionMeta } = useTransactionDetails();
  const { amountUnformatted } = useTokenAmount({ transactionMeta }) ?? {};

  const { metamaskPay } = transactionMeta;
  const { totalFiat: payTotal } = metamaskPay || {};

  const total = payTotal ?? amountUnformatted;

  const totalFormatted = useMemo(
    () => formatFiat(new BigNumber(total ?? '0')),
    [formatFiat, total],
  );

  if (!payTotal && !hasTransactionType(transactionMeta, FALLBACK_TYPES)) {
    return null;
  }

  const label = hasTransactionType(transactionMeta, [
    TransactionType.musdClaim,
    TransactionType.predictClaim,
    TransactionType.predictWithdraw,
  ])
    ? strings('transaction_details.label.received_total')
    : strings('transaction_details.label.total');

  return (
    <TransactionDetailsRow label={label}>
      <Text testID={TransactionDetailsSelectorIDs.TOTAL}>{totalFormatted}</Text>
    </TransactionDetailsRow>
  );
}
