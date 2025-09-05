import React, { useEffect } from 'react';
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
import { createProjectLogger } from '@metamask/utils';

const log = createProjectLogger('transaction-pay');

export function TotalRow() {
  const { id: transactionId, type } = useTransactionMetadataOrThrow();
  const totals = useTransactionTotalFiat();
  const { totalFormatted } = totals;

  const isQuotesLoading = useSelector((state: RootState) =>
    selectIsTransactionBridgeQuotesLoadingById(state, transactionId),
  );

  useEffect(() => {
    log('Total fiat', totals);
  }, [totals]);

  return (
    <View testID="total-row">
      <InfoRow
        label={strings('confirm.label.total')}
        tooltip={getTooltip(type)}
      >
        {isQuotesLoading ? (
          <AnimatedSpinner size={SpinnerSize.SM} />
        ) : (
          <Text>{totalFormatted}</Text>
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
