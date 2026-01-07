import React, { useMemo } from 'react';
import { TransactionDetailsRow } from '../transaction-details-row/transaction-details-row';
import Text from '../../../../../../component-library/components/Texts/Text';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { strings } from '../../../../../../../locales/i18n';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { BigNumber } from 'bignumber.js';
import { TransactionDetailsSelectorIDs } from '../../../../../../../e2e/selectors/Transactions/TransactionDetailsModal.selectors';

export function TransactionDetailsBridgeFeeRow() {
  const formatFiat = useFiatFormatter({ currency: 'usd' });
  const { transactionMeta } = useTransactionDetails();
  const { metamaskPay } = transactionMeta;
  const { bridgeFeeFiat } = metamaskPay || {};

  const bridgeFeeFiatFormatted = useMemo(
    () => formatFiat(new BigNumber(bridgeFeeFiat ?? 0)),
    [bridgeFeeFiat, formatFiat],
  );

  if (!bridgeFeeFiat) {
    return null;
  }

  return (
    <TransactionDetailsRow
      label={strings('transaction_details.label.bridge_fee')}
    >
      <Text testID={TransactionDetailsSelectorIDs.TRANSACTION_FEE}>
        {bridgeFeeFiatFormatted}
      </Text>
    </TransactionDetailsRow>
  );
}
