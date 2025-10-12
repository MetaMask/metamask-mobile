import React, { useMemo } from 'react';
import Text from '../../../../../../component-library/components/Texts/Text';
import InfoRow from '../../UI/info-row';
import { strings } from '../../../../../../../locales/i18n';
import { useTransactionMetadataOrThrow } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../../reducers';
import { View } from 'react-native';
import { SkeletonRow } from '../skeleton-row';
import {
  selectIsTransactionPayLoadingByTransactionId,
  selectTransactionPayTotalsByTransactionId,
} from '../../../../../../selectors/transactionPayController';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { BigNumber } from 'bignumber.js';

export function TotalRow() {
  const { id: transactionId } = useTransactionMetadataOrThrow();
  const formatFiat = useFiatFormatter();

  const isLoading = useSelector((state: RootState) =>
    selectIsTransactionPayLoadingByTransactionId(state, transactionId),
  );

  const totals = useSelector((state: RootState) =>
    selectTransactionPayTotalsByTransactionId(state, transactionId),
  );

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
