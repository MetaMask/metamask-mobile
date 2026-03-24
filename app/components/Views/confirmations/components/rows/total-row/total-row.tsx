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

/**
 * Row component that displays the total cost for deposit/payment transactions.
 * For withdrawal transactions, use ReceiveRow instead.
 */
export function TotalRow({ excludeFees }: { excludeFees?: boolean } = {}) {
  const formatFiat = useFiatFormatter({ currency: 'usd' });
  const isLoading = useIsTransactionPayLoading();
  const totals = useTransactionPayTotals();

  const totalUsd = useMemo(() => {
    const rawUsd = excludeFees ? totals?.targetAmount?.usd : totals?.total?.usd;
    if (!rawUsd) return '';
    return formatFiat(new BigNumber(rawUsd));
  }, [totals, excludeFees, formatFiat]);

  if (isLoading) {
    return <InfoRowSkeleton testId="total-row-skeleton" />;
  }

  return (
    <View testID="total-row">
      <InfoRow
        label={strings('confirm.label.total')}
        rowVariant={InfoRowVariant.Small}
      >
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
