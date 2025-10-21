import React, { useMemo } from 'react';
import { TransactionDetailsRow } from '../transaction-details-row/transaction-details-row';
import Text from '../../../../../../component-library/components/Texts/Text';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { strings } from '../../../../../../../locales/i18n';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { BigNumber } from 'bignumber.js';

export function TransactionDetailsNetworkFeeRow() {
  const formatFiat = useFiatFormatter({ currency: 'usd' });
  const { transactionMeta } = useTransactionDetails();
  const { metamaskPay } = transactionMeta;
  const { networkFeeFiat } = metamaskPay || {};

  const networkFeeFiatFormatted = useMemo(
    () => formatFiat(new BigNumber(networkFeeFiat ?? 0)),
    [formatFiat, networkFeeFiat],
  );

  if (!networkFeeFiat) {
    return null;
  }

  return (
    <TransactionDetailsRow
      label={strings('transaction_details.label.network_fee')}
    >
      <Text>{networkFeeFiatFormatted}</Text>
    </TransactionDetailsRow>
  );
}
