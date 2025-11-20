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
import { useTransactionPayFiat } from '../../../hooks/pay/useTransactionPayFiat';
import { InfoRowSkeleton, InfoRowVariant } from '../../UI/info-row/info-row';

export function TotalRow() {
  const { formatFiat } = useTransactionPayFiat();
  const isLoading = useIsTransactionPayLoading();
  const totals = useTransactionPayTotals();

  const totalUsd = useMemo(() => {
    if (!totals?.total) return '';

    return formatFiat(new BigNumber(totals.total.usd));
  }, [totals, formatFiat]);

  if (isLoading) {
    return <InfoRowSkeleton testId="total-row-skeleton" />;
  }

  return (
    <View accessibilityRole="none" accessible={false} testID="total-row">
      <InfoRow
        label={strings('confirm.label.total')}
        rowVariant={InfoRowVariant.Small}
      >
        <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
          {totalUsd}
        </Text>
      </InfoRow>
    </View>
  );
}
