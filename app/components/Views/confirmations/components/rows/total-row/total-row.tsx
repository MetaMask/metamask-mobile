import React from 'react';
import Text from '../../../../../../component-library/components/Texts/Text';
import InfoRow from '../../UI/info-row';
import { useTransactionTotalFiat } from '../../../hooks/pay/useTransactionTotalFiat';
import { strings } from '../../../../../../../locales/i18n';
import { useTransactionMetadataOrThrow } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { useSelector } from 'react-redux';
import { selectIsTransactionBridgeQuotesLoadingById } from '../../../../../../core/redux/slices/confirmationMetrics';
import { RootState } from '../../../../../../reducers';
import AnimatedSpinner, {
  SpinnerSize,
} from '../../../../../UI/AnimatedSpinner';
import { View } from 'react-native';
import { TransactionType } from '@metamask/transaction-controller';

export function TotalRow() {
  const { id: transactionId, type } = useTransactionMetadataOrThrow();
  const { totalFormatted: totalFiat } = useTransactionTotalFiat();

  const isQuotesLoading = useSelector((state: RootState) =>
    selectIsTransactionBridgeQuotesLoadingById(state, transactionId),
  );

  return (
    <View testID="total-row">
      <InfoRow
        label={strings('confirm.label.total')}
        tooltip={getTooltip(type)}
      >
        {isQuotesLoading ? (
          <AnimatedSpinner size={SpinnerSize.SM} />
        ) : (
          <Text>{totalFiat}</Text>
        )}
      </InfoRow>
    </View>
  );
}

function getTooltip(type?: TransactionType) {
  switch (type) {
    case TransactionType.perpsDeposit:
      return strings('confirm.tooltip.perps_deposit.total');
    default:
      return undefined;
  }
}
