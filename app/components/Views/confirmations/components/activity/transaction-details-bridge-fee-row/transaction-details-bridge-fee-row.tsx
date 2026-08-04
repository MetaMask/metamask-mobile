import React, { useMemo } from 'react';
import {
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { TransactionDetailsRow } from '../transaction-details-row/transaction-details-row';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { strings } from '../../../../../../../locales/i18n';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { BigNumber } from 'bignumber.js';
import { TransactionDetailsSelectorIDs } from '../TransactionDetailsModal.testIds';
import { Text } from '@metamask/design-system-react-native';

export function TransactionDetailsBridgeFeeRow() {
  const formatFiat = useFiatFormatter({ currency: 'usd' });
  const { transactionMeta } = useTransactionDetails();
  const { metamaskPay } = transactionMeta;
  const { bridgeFeeFiat } = metamaskPay || {};

  const isWithdraw = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountWithdraw,
    TransactionType.perpsWithdraw,
    TransactionType.predictWithdraw,
  ]);

  const label = isWithdraw
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
