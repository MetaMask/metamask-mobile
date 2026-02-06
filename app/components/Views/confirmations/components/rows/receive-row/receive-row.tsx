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

export interface ReceiveRowProps {
  /** The user's input amount in USD */
  inputAmountUsd: string;
}

/**
 * Row component that displays "You'll receive" for withdrawal transactions.
 * Calculates: Input amount - Provider fee
 * (Network fees are paid separately from POL balance, not deducted from withdrawal)
 */
export function ReceiveRow({ inputAmountUsd }: ReceiveRowProps) {
  const formatFiat = useFiatFormatter({ currency: 'usd' });
  const isLoading = useIsTransactionPayLoading();
  const totals = useTransactionPayTotals();

  const receiveUsd = useMemo(() => {
    if (!totals || !inputAmountUsd) return '';

    const inputUsd = new BigNumber(inputAmountUsd);
    const providerFee = new BigNumber(totals.fees?.provider?.usd ?? 0);

    const youReceive = inputUsd.minus(providerFee);
    return formatFiat(youReceive.isPositive() ? youReceive : new BigNumber(0));
  }, [totals, formatFiat, inputAmountUsd]);

  if (isLoading) {
    return <InfoRowSkeleton testId="receive-row-skeleton" />;
  }

  return (
    <View testID="receive-row">
      <InfoRow
        label={strings('confirm.label.you_receive')}
        rowVariant={InfoRowVariant.Small}
      >
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          testID={ConfirmationRowComponentIDs.RECEIVE}
        >
          {receiveUsd}
        </Text>
      </InfoRow>
    </View>
  );
}
