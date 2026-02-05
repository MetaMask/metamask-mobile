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

const RECEIVE_TYPES = [
  TransactionType.musdClaim,
  TransactionType.predictClaim,
  TransactionType.predictWithdraw,
];

// Transaction types that use user's currency instead of USD
const USER_CURRENCY_TYPES = [TransactionType.musdClaim];

export function TransactionDetailsTotalRow() {
  const formatFiatUsd = useFiatFormatter({ currency: 'usd' });
  const formatFiatUser = useFiatFormatter();
  const { transactionMeta } = useTransactionDetails();
  const { amountUnformatted, fiatUnformatted } =
    useTokenAmount({ transactionMeta }) ?? {};

  const { metamaskPay } = transactionMeta;
  const { totalFiat: payTotal } = metamaskPay || {};

  const useUserCurrency = hasTransactionType(
    transactionMeta,
    USER_CURRENCY_TYPES,
  );
  const total =
    payTotal ?? (useUserCurrency ? fiatUnformatted : amountUnformatted);
  const formatFiat = useUserCurrency ? formatFiatUser : formatFiatUsd;

  const totalFormatted = useMemo(
    () => formatFiat(new BigNumber(total ?? '0')),
    [formatFiat, total],
  );

  if (!payTotal && !hasTransactionType(transactionMeta, FALLBACK_TYPES)) {
    return null;
  }

  const label = hasTransactionType(transactionMeta, RECEIVE_TYPES)
    ? strings('transaction_details.label.received_total')
    : strings('transaction_details.label.total');

  return (
    <TransactionDetailsRow label={label}>
      <Text testID={TransactionDetailsSelectorIDs.TOTAL}>{totalFormatted}</Text>
    </TransactionDetailsRow>
  );
}
