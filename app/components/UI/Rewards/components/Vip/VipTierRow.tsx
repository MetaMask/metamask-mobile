import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { formatCompactValue, formatNumber } from '../../utils/formatUtils';
import type { VipTierDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import {
  VIP_GOLD_BACKGROUND_MUTED,
  VIP_GOLD_TEXT_DEFAULT,
} from './Vip.constants';

export const VIP_TIER_ROW_TEST_IDS = {
  CONTAINER: 'vip-tier-row',
  CHECK: 'vip-tier-row-check',
  NAME: 'vip-tier-row-name',
  THRESHOLDS: 'vip-tier-row-thresholds',
  REVENUE_SHARE_FEE: 'vip-tier-row-revenue-share-fee',
  SWAPS_FEE: 'vip-tier-row-swaps-fee',
  PERPS_FEE: 'vip-tier-row-perps-fee',
} as const;

interface VipTierRowProps {
  tier: VipTierDto;
  isNext?: boolean;
}

const isCurrent = (status: string): boolean => status === 'current';
const isUpcoming = (status: string): boolean => status === 'upcoming';

const currentTierIconStyle = {
  color: VIP_GOLD_TEXT_DEFAULT,
};

const currentTierContainerStyle = {
  backgroundColor: VIP_GOLD_BACKGROUND_MUTED,
};

const VipTierRow: React.FC<VipTierRowProps> = ({ tier, isNext = false }) => {
  const current = isCurrent(tier.status);
  // Only the current tier and the immediately-upcoming tier render in the
  // primary text/icon color; completed (previous) tiers and further-out
  // upcoming tiers are dimmed.
  const dim = !current && !isNext;
  const textColor = dim ? TextColor.TextAlternative : TextColor.TextDefault;
  const feeColor = dim ? TextColor.TextAlternative : TextColor.TextDefault;
  const iconColor = current ? undefined : IconColor.IconAlternative;
  const iconStyle = current ? currentTierIconStyle : {};
  const revenueSharePercentage =
    tier.revenueShareBps !== undefined
      ? formatNumber(tier.revenueShareBps / 100, 2)
      : tier.revenueShareBps;

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="py-2"
      style={current ? currentTierContainerStyle : undefined}
      testID={`${VIP_TIER_ROW_TEST_IDS.CONTAINER}-${tier.id}`}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="flex-1 px-4"
      >
        <Icon
          name={
            isUpcoming(tier.status)
              ? IconName.FullCircle
              : IconName.Confirmation
          }
          size={IconSize.Lg}
          color={iconColor}
          style={iconStyle}
          testID={VIP_TIER_ROW_TEST_IDS.CHECK}
        />
        <Box twClassName="flex-1 ml-3" testID={VIP_TIER_ROW_TEST_IDS.NAME}>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Bold}
            color={textColor}
          >
            {tier.name}
          </Text>
          {tier.tier > 1 ? (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              testID={VIP_TIER_ROW_TEST_IDS.THRESHOLDS}
            >
              {strings('rewards.vip.tier_thresholds', {
                points: formatCompactValue(tier.pointsRequirement),
              })}
            </Text>
          ) : null}
        </Box>
        <Box
          alignItems={BoxAlignItems.End}
          justifyContent={BoxJustifyContent.Center}
          twClassName="ml-3"
        >
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('rewards.vip.revenue_share_label')}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={feeColor}
            testID={VIP_TIER_ROW_TEST_IDS.REVENUE_SHARE_FEE}
          >
            {`${revenueSharePercentage}%`}
          </Text>
        </Box>
        <Box
          alignItems={BoxAlignItems.End}
          justifyContent={BoxJustifyContent.Center}
          twClassName="ml-3"
        >
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('rewards.vip.swaps_label')}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={feeColor}
            testID={VIP_TIER_ROW_TEST_IDS.SWAPS_FEE}
          >
            {strings('rewards.vip.bps_value', { bps: tier.swapsBps })}
          </Text>
        </Box>
        <Box
          alignItems={BoxAlignItems.End}
          justifyContent={BoxJustifyContent.Center}
          twClassName="ml-4 w-16"
        >
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('rewards.vip.perps_label')}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={feeColor}
            testID={VIP_TIER_ROW_TEST_IDS.PERPS_FEE}
          >
            {strings('rewards.vip.bps_value', { bps: tier.perpsBps })}
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

export default VipTierRow;
