import React, { useMemo } from 'react';
import { TransactionDetailsRow } from '../transaction-details-row/transaction-details-row';
import Text from '../../../../../../component-library/components/Texts/Text';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { strings } from '../../../../../../../locales/i18n';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { BigNumber } from 'bignumber.js';

export function TransactionDetailsTotalRow() {
  const formatFiat = useFiatFormatter({ currency: 'usd' });
  const { transactionMeta } = useTransactionDetails();
  const { metamaskPay } = transactionMeta;
  const { totalFiat } = metamaskPay || {};

  const totalFiatFormatted = useMemo(
    () => formatFiat(new BigNumber(totalFiat ?? '0')),
    [formatFiat, totalFiat],
  );

  if (!totalFiat) {
    return null;
  }

  return (
    <TransactionDetailsRow label={strings('transaction_details.label.total')}>
      <Text>{totalFiatFormatted}</Text>
    </TransactionDetailsRow>
  );
}
