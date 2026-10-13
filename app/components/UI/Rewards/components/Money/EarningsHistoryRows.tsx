import React from 'react';
import {
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
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
  EarningOriginType,
  LedgerEarningEntryDto,
  ReferralLocalizedText,
} from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { isVoidedEarning } from '../../utils/earningsSummaryTotals';
import {
  isPendingClaimRow,
  type EarningsHistoryListItem,
} from '../../utils/claimEarnings';
import {
  formatMusdBaseUnits,
  formatRewardsRelativeTime,
} from '../../utils/formatUtils';

export const EARNINGS_HISTORY_TEST_IDS = {
  ROW: 'earnings-history-row',
} as const;

function earningTitle(
  origin: EarningOriginType,
  localizedText: ReferralLocalizedText,
): string {
  switch (origin) {
    case 'REFERRAL_REV_SHARE':
      return localizedText.historyReferrals;
    case 'SOCIAL_FOLLOW_TRADE':
      return localizedText.historyCommission;
    case 'SWAPS_FEE_CASHBACK':
    case 'PERPS_FEE_CASHBACK':
      return localizedText.historyRebate;
  }
}

function earningIcon(origin: EarningOriginType): IconName {
  switch (origin) {
    case 'REFERRAL_REV_SHARE':
      return IconName.UserCircleAdd;
    case 'SOCIAL_FOLLOW_TRADE':
      return IconName.Copy;
    case 'SWAPS_FEE_CASHBACK':
    case 'PERPS_FEE_CASHBACK':
      return IconName.Coin;
  }
}

/** A positive payout reads as money leaving the claimable balance. */
function claimDebit(netAmount: string): string | null {
  let units = netAmount;
  try {
    if (BigInt(netAmount) > 0n) {
      units = `-${netAmount}`;
    }
  } catch {
    return null;
  }
  return formatMusdBaseUnits(units, { maximumFractionDigits: 2 });
}

function earningAmount(item: LedgerEarningEntryDto): {
  label: string;
  color: TextColor;
  voided: boolean;
} {
  const voided = isVoidedEarning(item.voided_musd_amount);

  return {
    label:
      formatMusdBaseUnits(item.musd_amount, {
        signed: true,
        maximumFractionDigits: 2,
      }) ?? '—',
    color: voided ? TextColor.TextAlternative : TextColor.SuccessDefault,
    voided,
  };
}

export const EarningsHistoryRow: React.FC<{
  item: EarningsHistoryListItem;
  localizedText: ReferralLocalizedText;
}> = ({ item, localizedText }) => {
  const pending = isPendingClaimRow(item);
  const isClaim = pending || item.type === 'claim';
  const title = isClaim
    ? localizedText.historyClaimed
    : earningTitle(item.earning_origin_type, localizedText);
  const credited = isClaim ? null : earningAmount(item);
  let amount: string | null;
  if (isPendingClaimRow(item)) {
    amount = claimDebit(item.net_amount);
  } else if (item.type === 'claim') {
    amount = claimDebit(item.net_amount);
  } else {
    amount = credited?.label ?? null;
  }
  const amountColor = isClaim
    ? TextColor.TextAlternative
    : (credited?.color ?? TextColor.SuccessDefault);
  const voided = credited?.voided === true;
  const subtitle = pending
    ? localizedText.historyClaimPending
    : formatRewardsRelativeTime(new Date(item.ledger_timestamp));
  const iconName = isClaim
    ? IconName.Arrow2UpRight
    : earningIcon(item.earning_origin_type);
  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="gap-3"
      testID={`${EARNINGS_HISTORY_TEST_IDS.ROW}-${item.id}`}
    >
      <AvatarIcon
        iconName={iconName}
        size={AvatarIconSize.Md}
        severity={AvatarIconSeverity.Neutral}
        iconProps={{ color: IconColor.IconDefault }}
      />
      <Box twClassName="flex-1">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-2"
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            twClassName="shrink"
          >
            {title}
          </Text>
          {voided ? null : (
            <Text
              variant={TextVariant.BodyMd}
              color={amountColor}
              twClassName="ml-auto"
            >
              {amount ?? '—'}
            </Text>
          )}
        </Box>
        <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
          {subtitle}
        </Text>
      </Box>
      {voided ? (
        <Box alignItems={BoxAlignItems.End}>
          <Text variant={TextVariant.BodyMd} color={amountColor}>
            {amount ?? '—'}
          </Text>
          <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
            {localizedText.voided}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
};
