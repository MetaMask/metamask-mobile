import React, { useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
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
import type {
  VipLocalizedTextDto,
  VipTierDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import {
  VIP_GOLD_BACKGROUND_MUTED,
  VIP_GOLD_TEXT_DEFAULT,
  VIP_GOLD_TIER_GRADIENT_COLORS,
} from './Vip.constants';

export const VIP_TIER_ROW_TEST_IDS = {
  CONTAINER: 'vip-tier-row',
  HEADER: 'vip-tier-row-header',
  CHEVRON: 'vip-tier-row-chevron',
  NAME: 'vip-tier-row-name',
  THRESHOLDS: 'vip-tier-row-thresholds',
  DETAILS: 'vip-tier-row-details',
  REVENUE_SHARE_FEE: 'vip-tier-row-revenue-share-fee',
  SWAPS_FEE: 'vip-tier-row-swaps-fee',
  PERPS_FEE: 'vip-tier-row-perps-fee',
  REFERRAL_POINTS: 'vip-tier-row-referral-points',
  CURRENT_TIER_GRADIENT: 'vip-tier-row-current-tier-gradient',
} as const;

interface VipTierRowProps {
  tier: VipTierDto;
  localizedText: Pick<
    VipLocalizedTextDto,
    | 'revenueShareTitle'
    | 'swapsFeeTitle'
    | 'perpsFeeTitle'
    | 'referralPointsTitle'
  >;
  isNext?: boolean;
  isLast?: boolean;
}

const isCurrent = (status: string): boolean => status === 'current';
const isCompleted = (status: string): boolean => status === 'completed';

const rowPressableStyle = { width: '100%' as const };

const currentTierContainerStyle = {
  backgroundColor: VIP_GOLD_BACKGROUND_MUTED,
};

const currentTierGradientOverlayStyle = {
  position: 'absolute' as const,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

const currentTierGradientStyle = {
  flex: 1,
};

const currentTierGradientStart = { x: 0, y: 0 };
const currentTierGradientEnd = { x: 0, y: 1 };

const currentTierTextStyle = {
  color: VIP_GOLD_TEXT_DEFAULT,
};

const VIP_TIER_ROW_ANIMATION_DURATION_MS = 180;
const vipTierRowLayoutTransition = LinearTransition.duration(
  VIP_TIER_ROW_ANIMATION_DURATION_MS,
);
const vipTierDetailsEntering = FadeIn.duration(
  VIP_TIER_ROW_ANIMATION_DURATION_MS,
);
const vipTierDetailsExiting = FadeOut.duration(
  VIP_TIER_ROW_ANIMATION_DURATION_MS,
);

interface VipTierDetailRowProps {
  label: string;
  value: string;
  testID: string;
}

const VipTierDetailRow: React.FC<VipTierDetailRowProps> = ({
  label,
  value,
  testID,
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
  >
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      color={TextColor.TextAlternative}
    >
      {label}
    </Text>
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      testID={testID}
    >
      {value}
    </Text>
  </Box>
);

const VipTierRow: React.FC<VipTierRowProps> = ({
  tier,
  localizedText,
  isNext = false,
  isLast = false,
}) => {
  const current = isCurrent(tier.status);
  const [expanded, setExpanded] = useState(current);
  const currentTierGradientOpacity = useSharedValue(current ? 1 : 0);
  const dim = isCompleted(tier.status) && !current && !isNext;
  const textColor = dim ? TextColor.TextAlternative : TextColor.TextDefault;
  const pointsColor = current
    ? TextColor.TextDefault
    : TextColor.TextAlternative;
  const iconColor = current ? undefined : IconColor.IconAlternative;
  const revenueSharePercentage =
    tier.revenueShareBps !== undefined
      ? formatNumber(tier.revenueShareBps / 100, 2)
      : tier.revenueShareBps;
  const referralPointsPercentage = formatNumber(
    tier.referralCarryoverBps / 100,
    2,
  );

  useEffect(() => {
    setExpanded(current);
  }, [current, tier.id]);

  useEffect(() => {
    currentTierGradientOpacity.value = withTiming(current && expanded ? 1 : 0, {
      duration: VIP_TIER_ROW_ANIMATION_DURATION_MS,
    });
  }, [current, currentTierGradientOpacity, expanded]);

  const currentTierGradientAnimatedStyle = useAnimatedStyle(() => ({
    opacity: currentTierGradientOpacity.value,
  }));

  const rowContent = (
    <Box
      twClassName={isLast ? undefined : 'border-background-default border-b-4'}
    >
      <Pressable
        onPress={() => setExpanded((value) => !value)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        style={rowPressableStyle}
        testID={`${VIP_TIER_ROW_TEST_IDS.HEADER}-${tier.id}`}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="px-4 py-4"
        >
          <Box twClassName="flex-1" testID={VIP_TIER_ROW_TEST_IDS.NAME}>
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Bold}
              color={textColor}
              style={current ? currentTierTextStyle : undefined}
            >
              {tier.name}
            </Text>
          </Box>
          {tier.tier > 1 ? (
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Bold}
              color={pointsColor}
              twClassName="ml-3"
              testID={VIP_TIER_ROW_TEST_IDS.THRESHOLDS}
            >
              {strings('rewards.vip.tier_thresholds', {
                points: formatCompactValue(tier.pointsRequirement),
              })}
            </Text>
          ) : null}
          <Box twClassName="ml-3">
            <Icon
              name={expanded ? IconName.ArrowUp : IconName.ArrowDown}
              size={IconSize.Sm}
              color={iconColor}
              testID={VIP_TIER_ROW_TEST_IDS.CHEVRON}
            />
          </Box>
        </Box>
      </Pressable>
      {expanded ? (
        <Animated.View
          entering={vipTierDetailsEntering}
          exiting={vipTierDetailsExiting}
          layout={vipTierRowLayoutTransition}
          testID={`${VIP_TIER_ROW_TEST_IDS.DETAILS}-${tier.id}`}
        >
          <Box twClassName="gap-2 px-4 pb-5">
            <VipTierDetailRow
              label={localizedText.revenueShareTitle}
              value={`${revenueSharePercentage}%`}
              testID={VIP_TIER_ROW_TEST_IDS.REVENUE_SHARE_FEE}
            />
            <VipTierDetailRow
              label={localizedText.swapsFeeTitle}
              value={strings('rewards.vip.bps_value', {
                bps: tier.swapsBps,
              })}
              testID={VIP_TIER_ROW_TEST_IDS.SWAPS_FEE}
            />
            <VipTierDetailRow
              label={localizedText.perpsFeeTitle}
              value={strings('rewards.vip.bps_value', {
                bps: tier.perpsBps,
              })}
              testID={VIP_TIER_ROW_TEST_IDS.PERPS_FEE}
            />
            <VipTierDetailRow
              label={localizedText.referralPointsTitle}
              value={`${referralPointsPercentage}%`}
              testID={VIP_TIER_ROW_TEST_IDS.REFERRAL_POINTS}
            />
          </Box>
        </Animated.View>
      ) : null}
    </Box>
  );

  return (
    <Animated.View
      layout={vipTierRowLayoutTransition}
      style={current ? currentTierContainerStyle : undefined}
      testID={`${VIP_TIER_ROW_TEST_IDS.CONTAINER}-${tier.id}`}
    >
      {current ? (
        <Animated.View
          pointerEvents="none"
          style={[
            currentTierGradientOverlayStyle,
            currentTierGradientAnimatedStyle,
          ]}
        >
          <LinearGradient
            colors={VIP_GOLD_TIER_GRADIENT_COLORS}
            start={currentTierGradientStart}
            end={currentTierGradientEnd}
            style={currentTierGradientStyle}
            testID={VIP_TIER_ROW_TEST_IDS.CURRENT_TIER_GRADIENT}
          />
        </Animated.View>
      ) : null}
      {rowContent}
    </Animated.View>
  );
};

export default VipTierRow;
