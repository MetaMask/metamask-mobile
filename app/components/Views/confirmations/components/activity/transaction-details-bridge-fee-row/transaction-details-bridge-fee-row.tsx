import React, { useMemo } from 'react';
import { TransactionType } from '@metamask/transaction-controller';
import { TransactionDetailsRow } from '../transaction-details-row/transaction-details-row';
import Text from '../../../../../../component-library/components/Texts/Text';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { hasTransactionType } from '../../../utils/transaction';
import { strings } from '../../../../../../../locales/i18n';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { BigNumber } from 'bignumber.js';
import { TransactionDetailsSelectorIDs } from '../TransactionDetailsModal.testIds';

export function TransactionDetailsBridgeFeeRow() {
  const formatFiat = useFiatFormatter({ currency: 'usd' });
  const { transactionMeta } = useTransactionDetails();
  const { metamaskPay } = transactionMeta;
  const { bridgeFeeFiat } = metamaskPay || {};

  const isPredictWithdraw = hasTransactionType(transactionMeta, [
    TransactionType.predictWithdraw,
  ]);

  const label = isPredictWithdraw
    ? strings('transaction_details.label.provider_fee')
    : strings('transaction_details.label.bridge_fee');

  const bridgeFeeFiatFormatted = useMemo(
    () => formatFiat(new BigNumber(bridgeFeeFiat ?? 0)),
    [bridgeFeeFiat, formatFiat],
  );

  if (!bridgeFeeFiat) {
    return null;
  }

  return (
    <TransactionDetailsRow label={label}>
      <Text testID={TransactionDetailsSelectorIDs.TRANSACTION_FEE}>
        {bridgeFeeFiatFormatted}
      </Text>
    </TransactionDetailsRow>
  );
}
