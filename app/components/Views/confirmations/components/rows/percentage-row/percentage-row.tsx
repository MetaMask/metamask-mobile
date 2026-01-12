import React from 'react';
import InfoRow from '../../UI/info-row';
import { MUSD_CONVERSION_APY } from '../../../../../UI/Earn/constants/musd';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import { useIsTransactionPayLoading } from '../../../hooks/pay/useTransactionPayData';
import { InfoRowSkeleton } from '../../UI/info-row/info-row';
import { strings } from '../../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { hasTransactionType } from '../../../utils/transaction';
import { TransactionType } from '@metamask/transaction-controller';

export function PercentageRow() {
  const transactionMetadata = useTransactionMetadataRequest();

  const isLoading = useIsTransactionPayLoading();

  const label = (() => {
    if (
      hasTransactionType(transactionMetadata, [TransactionType.musdConversion])
    ) {
      return strings('earn.bonus');
    }

    return strings('earn.earning');
  })();

  if (
    !hasTransactionType(transactionMetadata, [TransactionType.musdConversion])
  ) {
    return null;
  }

  if (isLoading) {
    return <InfoRowSkeleton testId="percentage-row-skeleton" />;
  }

  return (
    <InfoRow label={label}>
      <Text variant={TextVariant.BodyMD} color={TextColor.Success}>
        {MUSD_CONVERSION_APY}%
      </Text>
    </InfoRow>
  );
}
