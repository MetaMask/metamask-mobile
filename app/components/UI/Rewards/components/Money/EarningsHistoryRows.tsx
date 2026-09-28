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
  LedgerEntryDto,
  ReferralLocalizedText,
} from '../../../../../core/Engine/controllers/rewards-money-controller/types';
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

export const EarningsHistoryRow: React.FC<{
  item: LedgerEntryDto;
  localizedText: ReferralLocalizedText;
}> = ({ item, localizedText }) => {
  const isClaim = item.type === 'claim';
  const title = isClaim
    ? localizedText.historyClaimed
    : earningTitle(item.earning_origin_type, localizedText);
  const amount = isClaim
    ? claimDebit(item.net_amount)
    : formatMusdBaseUnits(item.musd_amount, {
        signed: true,
        maximumFractionDigits: 2,
      });

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="gap-3"
      testID={`${EARNINGS_HISTORY_TEST_IDS.ROW}-${item.id}`}
    >
      <AvatarIcon
        iconName={
          isClaim
            ? IconName.Arrow2UpRight
            : earningIcon(item.earning_origin_type)
        }
        size={AvatarIconSize.Md}
        severity={AvatarIconSeverity.Neutral}
        iconProps={{ color: IconColor.IconDefault }}
      />
      <Box twClassName="flex-1">
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {title}
        </Text>
        <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
          {formatRewardsRelativeTime(new Date(item.ledger_timestamp))}
        </Text>
      </Box>
      <Text
        variant={TextVariant.BodyMd}
        color={isClaim ? TextColor.TextAlternative : TextColor.SuccessDefault}
      >
        {amount ?? '—'}
      </Text>
    </Box>
  );
};
