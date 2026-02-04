import React, { useMemo } from 'react';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import InfoRow from '../../UI/info-row';
import { strings } from '../../../../../../../locales/i18n';
import { View } from 'react-native';
import { BigNumber } from 'bignumber.js';
import {
  useIsTransactionPayLoading,
  useTransactionPayTotals,
} from '../../../hooks/pay/useTransactionPayData';
import { InfoRowSkeleton, InfoRowVariant } from '../../UI/info-row/info-row';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { ConfirmationRowComponentIDs } from '../../../ConfirmationView.testIds';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { isTransactionPayWithdraw } from '../../../utils/transaction';

export interface TotalRowProps {
  /** The user's input amount in USD (used for withdrawal "You'll receive" calculation) */
  inputAmountUsd?: string;
}

export function TotalRow({ inputAmountUsd }: TotalRowProps) {
  const formatFiat = useFiatFormatter({ currency: 'usd' });
  const isLoading = useIsTransactionPayLoading();
  const totals = useTransactionPayTotals();
  const transactionMeta = useTransactionMetadataRequest();
  const isWithdrawal = isTransactionPayWithdraw(transactionMeta);

  // For withdrawals: You'll receive = Input amount - Provider fee
  // (Network fees are paid separately from POL balance, not deducted from withdrawal)
  // For deposits: Total = source + all fees
  const totalUsd = useMemo(() => {
    if (!totals) return '';

    if (isWithdrawal && inputAmountUsd) {
      const inputUsd = new BigNumber(inputAmountUsd);
      const providerFee = new BigNumber(totals.fees?.provider?.usd ?? 0);

      const youReceive = inputUsd.minus(providerFee);
      return formatFiat(
        youReceive.isPositive() ? youReceive : new BigNumber(0),
      );
    }

    if (totals.total) {
      return formatFiat(new BigNumber(totals.total.usd));
    }

    return '';
  }, [totals, formatFiat, isWithdrawal, inputAmountUsd]);

  if (isLoading) {
    return <InfoRowSkeleton testId="total-row-skeleton" />;
  }

  // For withdrawals, use "You'll receive" label
  const label = isWithdrawal
    ? strings('confirm.label.you_receive')
    : strings('confirm.label.total');

  return (
    <View testID="total-row">
      <InfoRow label={label} rowVariant={InfoRowVariant.Small}>
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          testID={ConfirmationRowComponentIDs.TOTAL}
        >
          {totalUsd}
        </Text>
      </InfoRow>
    </View>
  );
}
