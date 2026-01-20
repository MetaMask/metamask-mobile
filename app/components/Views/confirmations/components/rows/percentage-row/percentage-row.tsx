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

function getTxTypeRowConfig(
  transactionType?: TransactionType,
): { label: string; tooltip: string } | undefined {
  if (transactionType === TransactionType.musdConversion) {
    return {
      label: strings('earn.claimable_bonus'),
      tooltip: strings('earn.claimable_bonus_tooltip'),
    };
  }

  return undefined;
}

export function PercentageRow() {
  const transactionMetadata = useTransactionMetadataRequest();

  const isLoading = useIsTransactionPayLoading();

  const transactionType = transactionMetadata?.type;
  const rowConfig = getTxTypeRowConfig(transactionType);

  if (!rowConfig) {
    return null;
  }

  if (isLoading) {
    return <InfoRowSkeleton testId="percentage-row-skeleton" />;
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
