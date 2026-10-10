import React from 'react';
import {
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
  AvatarToken,
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  IconColor,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type {
  CommissionEntryView,
  LedgerEarningEntryDto,
  ReferralLocalizedText,
} from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { creditedBaseUnits } from '../../utils/earningsSummaryTotals';
import {
  formatMusdBaseUnits,
  formatRewardsRelativeDay,
  formatRewardsRelativeTime,
} from '../../utils/formatUtils';

export const PERFORMANCE_ACTIVITY_TEST_IDS = {
  COMMISSION_ROW: 'performance-commission-row',
  REBATE_ROW: 'performance-rebate-row',
} as const;

function copiedTimesLabel(
  localizedText: ReferralLocalizedText,
  copiedTimes: number | null,
): string {
  if (copiedTimes === null || copiedTimes === 1) {
    return localizedText.copiedOnce;
  }
  return localizedText.copiedTimes.split('{count}').join(String(copiedTimes));
}

export const PerformanceCommissionRow: React.FC<{
  item: CommissionEntryView;
  localizedText: ReferralLocalizedText;
}> = ({ item, localizedText }) => {
  const name = item.token.symbol ?? item.token.key;

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="gap-3"
      testID={`${PERFORMANCE_ACTIVITY_TEST_IDS.COMMISSION_ROW}-${item.id}`}
    >
      <AvatarToken
        name={name}
        size={AvatarTokenSize.Md}
        testID={`performance-commission-avatar-${item.id}`}
      />
      <Box twClassName="flex-1">
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {name}
        </Text>
        <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
          {formatRewardsRelativeDay(item.day)}
        </Text>
      </Box>
      <Box alignItems={BoxAlignItems.End}>
        <Text variant={TextVariant.BodyMd} color={TextColor.SuccessDefault}>
          {formatMusdBaseUnits(item.musd_amount, {
            signed: true,
            maximumFractionDigits: 2,
          }) ?? '—'}
        </Text>
        <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
          {copiedTimesLabel(localizedText, item.copied_times)}
        </Text>
      </Box>
    </Box>
  );
};

function rebateTitle(
  item: LedgerEarningEntryDto,
  localizedText: ReferralLocalizedText,
): string {
  if (item.earning_origin_type === 'PERPS_FEE_CASHBACK') {
    return localizedText.rebatePerpsVolume;
  }
  return localizedText.rebateSwaps;
}

function rebateIconName(item: LedgerEarningEntryDto): IconName {
  if (item.earning_origin_type === 'PERPS_FEE_CASHBACK') {
    return IconName.Candlestick;
  }
  return IconName.SwapVertical;
}

function rebateAmount(item: LedgerEarningEntryDto): {
  label: string;
  color: TextColor;
} {
  const credited = creditedBaseUnits(item.musd_amount, item.voided_musd_amount);
  const fullyVoided = credited === '0' && item.voided_musd_amount !== '0';

  return {
    label:
      formatMusdBaseUnits(credited, {
        signed: true,
        maximumFractionDigits: 2,
      }) ?? '—',
    color: fullyVoided ? TextColor.TextAlternative : TextColor.SuccessDefault,
  };
}

export const PerformanceRebateRow: React.FC<{
  item: LedgerEarningEntryDto;
  localizedText: ReferralLocalizedText;
}> = ({ item, localizedText }) => {
  const amount = rebateAmount(item);

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="gap-3"
      testID={`${PERFORMANCE_ACTIVITY_TEST_IDS.REBATE_ROW}-${item.id}`}
    >
      <AvatarIcon
        iconName={rebateIconName(item)}
        size={AvatarIconSize.Md}
        severity={AvatarIconSeverity.Neutral}
        iconProps={{ color: IconColor.IconDefault }}
      />
      <Box twClassName="flex-1">
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          twClassName="shrink"
        >
          {rebateTitle(item, localizedText)}
        </Text>
        <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
          {formatRewardsRelativeTime(new Date(item.ledger_timestamp))}
        </Text>
      </Box>
      <Text variant={TextVariant.BodyMd} color={amount.color}>
        {amount.label}
      </Text>
    </Box>
  );
};
