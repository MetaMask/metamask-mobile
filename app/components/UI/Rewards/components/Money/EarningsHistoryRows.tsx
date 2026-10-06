import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
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
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import type {
  EarningOriginType,
  LedgerEarningEntryDto,
  ReferralLocalizedText,
} from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { creditedBaseUnits } from '../../utils/earningsSummaryTotals';
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
  PAUSED_ROW: 'earnings-history-paused-row',
  PAUSED_TAG: 'earnings-history-paused-tag',
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

export const EarningsHistoryRow: React.FC<{
  item: EarningsHistoryListItem;
  localizedText: ReferralLocalizedText;
}> = ({ item, localizedText }) => {
  const navigation = useNavigation<AppNavigationProp>();
  const pending = isPendingClaimRow(item);
  const isClaim = pending || item.type === 'claim';
  const underReview =
    !pending &&
    item.type === 'earning' &&
    item.blocking_reason === 'UNDER_REVIEW';
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
  const amountColor =
    underReview || isClaim
      ? TextColor.TextAlternative
      : (credited?.color ?? TextColor.SuccessDefault);
  const subtitle = pending
    ? localizedText.historyClaimPending
    : formatRewardsRelativeTime(new Date(item.ledger_timestamp));
  const iconName = isClaim
    ? IconName.Arrow2UpRight
    : earningIcon(item.earning_origin_type);
  const openRewardsPaused = useCallback(() => {
    navigation.navigate(Routes.MODAL.REWARDS_INFO_SHEET_MODAL, {
      title: localizedText.rewardPausedTitle,
      description: localizedText.rewardPausedDescription,
    });
  }, [localizedText, navigation]);

  const row = (
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
          {underReview ? (
            <Tag
              severity={TagSeverity.Neutral}
              testID={EARNINGS_HISTORY_TEST_IDS.PAUSED_TAG}
            >
              <Text
                variant={TextVariant.BodyXs}
                color={TextColor.TextAlternative}
              >
                {localizedText.paused}
              </Text>
            </Tag>
          ) : null}
          <Text
            variant={TextVariant.BodyMd}
            color={amountColor}
            twClassName="ml-auto"
          >
            {amount ?? '—'}
          </Text>
        </Box>
        <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
          {subtitle}
        </Text>
      </Box>
    </Box>
  );

  if (!underReview) {
    return row;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={openRewardsPaused}
      testID={EARNINGS_HISTORY_TEST_IDS.PAUSED_ROW}
    >
      {row}
    </Pressable>
  );
};
