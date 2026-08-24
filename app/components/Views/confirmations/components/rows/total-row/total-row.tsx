import React, { useMemo } from 'react';
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
import { useConfirmationContext } from '../../../context/confirmation-context';
import {
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';

/**
 * Row component that displays the total cost for deposit/payment transactions.
 * For withdrawal transactions, use ReceiveRow instead.
 */
export function TotalRow() {
  const formatFiat = useFiatFormatter({ currency: 'usd' });
  const isLoading = useIsTransactionPayLoading();
  const totals = useTransactionPayTotals();
  const { isHeadlessBuyInProgress } = useConfirmationContext();

  const totalUsd = useMemo(() => {
    if (!totals?.total) return '';
    return formatFiat(new BigNumber(totals.total.usd));
  }, [totals, formatFiat]);

  if (isLoading) {
    return <InfoRowSkeleton testId="total-row-skeleton" />;
  }

  const textColor = isHeadlessBuyInProgress
    ? TextColor.TextMuted
    : TextColor.TextAlternative;

  return (
    <View testID="total-row">
      <InfoRow
        label={strings('confirm.label.total')}
        variant={textColor}
        rowVariant={InfoRowVariant.Small}
      >
        <Text
          variant={TextVariant.BodyMd}
          color={textColor}
          testID={ConfirmationRowComponentIDs.TOTAL}
        >
          {totalUsd}
        </Text>
      </InfoRow>
    </View>
  );
}
