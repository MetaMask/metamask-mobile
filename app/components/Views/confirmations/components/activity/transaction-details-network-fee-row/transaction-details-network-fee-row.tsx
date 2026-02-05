import React, { useMemo } from 'react';
import { TransactionDetailsRow } from '../transaction-details-row/transaction-details-row';
import Text from '../../../../../../component-library/components/Texts/Text';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { strings } from '../../../../../../../locales/i18n';
import { TransactionType } from '@metamask/transaction-controller';
import { hasTransactionType } from '../../../utils/transaction';
import { useFeeCalculations } from '../../../hooks/gas/useFeeCalculations';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { BigNumber } from 'bignumber.js';
import { TransactionDetailsSelectorIDs } from '../TransactionDetailsModal.testIds';

const FALLBACK_TYPES = [
  TransactionType.predictClaim,
  TransactionType.predictWithdraw,
  TransactionType.musdClaim,
];

// Transaction types that use user's currency instead of USD
const USER_CURRENCY_TYPES = [TransactionType.musdClaim];

export function TransactionDetailsNetworkFeeRow() {
  const formatFiatUsd = useFiatFormatter({ currency: 'usd' });
  const formatFiatUser = useFiatFormatter();
  const { transactionMeta } = useTransactionDetails();
  const { estimatedFeeFiatPrecise } = useFeeCalculations(transactionMeta);

  const { metamaskPay } = transactionMeta;
  const { networkFeeFiat: payNetworkFeeFiat } = metamaskPay || {};

  const networkFee = payNetworkFeeFiat ?? estimatedFeeFiatPrecise;

  // Use user's currency for musdClaim, USD for others
  const useUserCurrency = hasTransactionType(
    transactionMeta,
    USER_CURRENCY_TYPES,
  );
  const formatFiat = useUserCurrency ? formatFiatUser : formatFiatUsd;

  const networkFeeFormatted = useMemo(
    () => formatFiat(new BigNumber(networkFee ?? 0)),
    [formatFiat, networkFee],
  );

  if (
    !payNetworkFeeFiat &&
    !hasTransactionType(transactionMeta, FALLBACK_TYPES)
  ) {
    return null;
  }

  return (
    <TransactionDetailsRow
      label={strings('transaction_details.label.network_fee')}
    >
      <Text testID={TransactionDetailsSelectorIDs.NETWORK_FEE}>
        {networkFeeFormatted}
      </Text>
    </TransactionDetailsRow>
  );
}
