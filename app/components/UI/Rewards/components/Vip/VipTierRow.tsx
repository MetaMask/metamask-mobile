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
import { formatCompactUsd } from '../../utils/formatUtils';
import type { VipTierDto } from '../../../../../core/Engine/controllers/rewards-controller/types';

export const VIP_TIER_ROW_TEST_IDS = {
  CONTAINER: 'vip-tier-row',
  CHECK: 'vip-tier-row-check',
  NAME: 'vip-tier-row-name',
  THRESHOLDS: 'vip-tier-row-thresholds',
  SWAPS_FEE: 'vip-tier-row-swaps-fee',
  PERPS_FEE: 'vip-tier-row-perps-fee',
} as const;

interface VipTierRowProps {
  tier: VipTierDto;
  isNext?: boolean;
}

const isCurrent = (status: string): boolean => status === 'current';

const formatRequirement = (value: number): string =>
  value === 0 ? '—' : formatCompactUsd(value);

const VipTierRow: React.FC<VipTierRowProps> = ({ tier, isNext = false }) => {
  const current = isCurrent(tier.status);
  // Only the current tier and the immediately-upcoming tier render in the
  // primary text/icon color; completed (previous) tiers and further-out
  // upcoming tiers are dimmed.
  const dim = !current && !isNext;

  const containerCls = current
    ? 'bg-success-muted rounded-2xl px-3 py-3'
    : 'px-3 py-3';
  const checkColor: IconColor = current
    ? IconColor.SuccessDefault
    : dim
      ? IconColor.IconAlternative
      : IconColor.IconDefault;
  const textColor: TextColor = dim
    ? TextColor.TextAlternative
    : TextColor.TextDefault;
  const feeColor: TextColor = current ? TextColor.SuccessDefault : textColor;

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName={containerCls}
      testID={`${VIP_TIER_ROW_TEST_IDS.CONTAINER}-${tier.id}`}
    >
      <Icon
        name={current ? IconName.CheckBold : IconName.Check}
        size={IconSize.Md}
        color={checkColor}
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
        {tier.tier > 0 ? (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            testID={VIP_TIER_ROW_TEST_IDS.THRESHOLDS}
          >
            {strings('rewards.vip.tier_thresholds', {
              swaps: formatRequirement(tier.swapsRequirementUsd),
              perps: formatRequirement(tier.perpsRequirementUsd),
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
          {strings('rewards.vip.swaps_label')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Bold}
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
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Bold}
          color={feeColor}
          testID={VIP_TIER_ROW_TEST_IDS.PERPS_FEE}
        >
          {strings('rewards.vip.bps_value', { bps: tier.perpsBps })}
        </Text>
      </Box>
    </Box>
  );
};

export default VipTierRow;
