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
import { TransactionType } from '@metamask/transaction-controller';
import { IconColor } from '../../../../../../component-library/components/Icons/Icon';

const TX_TYPE_ROW_CONFIG: Partial<
  Record<TransactionType, { label: string; tooltip: string }>
> = {
  [TransactionType.musdConversion]: {
    label: strings('earn.bonus'),
    tooltip: strings('earn.bonus_tooltip'),
  },
} as const;

export function PercentageRow() {
  const transactionMetadata = useTransactionMetadataRequest();

  const isLoading = useIsTransactionPayLoading();

  const transactionType = transactionMetadata?.type;
  const rowConfig = transactionType
    ? TX_TYPE_ROW_CONFIG[transactionType]
    : undefined;

  if (isLoading) {
    return <InfoRowSkeleton testId="percentage-row-skeleton" />;
  }

  if (!rowConfig) {
    return null;
  }

  const { label, tooltip } = rowConfig;

  return (
    <InfoRow
      label={label}
      tooltip={tooltip}
      tooltipColor={IconColor.Alternative}
    >
      <Text variant={TextVariant.BodyMD} color={TextColor.Success}>
        {MUSD_CONVERSION_APY}%
      </Text>
    </InfoRow>
  );
}
