import React, { useMemo } from 'react';
import Text from '../../../../../../component-library/components/Texts/Text';
import InfoRow from '../../UI/info-row';
import { strings } from '../../../../../../../locales/i18n';
import { View } from 'react-native';
import { SkeletonRow } from '../skeleton-row';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { BigNumber } from 'bignumber.js';
import {
  useIsTransactionPayLoading,
  useTransactionPayTotals,
} from '../../../hooks/pay/useTransactionPayData';

export function TotalRow() {
  const formatFiat = useFiatFormatter();
  const isLoading = useIsTransactionPayLoading();
  const totals = useTransactionPayTotals();

  const totalUsd = useMemo(() => {
    if (!totals?.total) return '';

    return formatFiat(new BigNumber(totals.total.usd));
  }, [totals, formatFiat]);

  if (isLoading) {
    return <SkeletonRow testId="total-row-skeleton" />;
  }

  return (
    <View testID="total-row">
      <InfoRow label={strings('confirm.label.total')}>
        <Text>{totalUsd}</Text>
      </InfoRow>
    </View>
  );
}
