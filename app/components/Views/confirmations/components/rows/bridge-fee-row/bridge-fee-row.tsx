import React from 'react';
import AnimatedSpinner, {
  SpinnerSize,
} from '../../../../../UI/AnimatedSpinner';
import InfoRow from '../../UI/info-row';
import { useTransactionMetadataOrThrow } from '../../../hooks/transactions/useTransactionMetadataRequest';
import {
  selectIsTransactionBridgeQuotesLoadingById,
  selectTransactionBridgeQuotesById,
} from '../../../../../../core/redux/slices/confirmationMetrics';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../../reducers';
import Text from '../../../../../../component-library/components/Texts/Text';
import { useTransactionTotalFiat } from '../../../hooks/pay/useTransactionTotalFiat';
import { strings } from '../../../../../../../locales/i18n';
import { TransactionType } from '@metamask/transaction-controller';

export function BridgeFeeRow() {
  const { id: transactionId, type } = useTransactionMetadataOrThrow();
  const { bridgeFeeFormatted } = useTransactionTotalFiat();

  const isQuotesLoading = useSelector((state: RootState) =>
    selectIsTransactionBridgeQuotesLoadingById(state, transactionId),
  );

  const quotes = useSelector((state: RootState) =>
    selectTransactionBridgeQuotesById(state, transactionId),
  );

  const show = isQuotesLoading || Boolean(quotes?.length);

  if (!show) {
    return null;
  }

  return (
    <InfoRow
      label={strings('confirm.label.bridge_fee')}
      tooltip={getTooltip(type)}
    >
      {isQuotesLoading ? (
        <AnimatedSpinner size={SpinnerSize.SM} />
      ) : (
        <Text>{bridgeFeeFormatted}</Text>
      )}
    </InfoRow>
  );
}

function getTooltip(type?: TransactionType) {
  switch (type) {
    case TransactionType.perpsDeposit:
      return strings('confirm.tooltip.perps_deposit.bridge_fee');
    default:
      return undefined;
  }
}
