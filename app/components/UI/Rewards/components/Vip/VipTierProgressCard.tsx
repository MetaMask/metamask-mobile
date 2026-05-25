import React from 'react';
import { Pressable } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type {
  VipProgressDto,
  VipTierRefDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import VipIcon from '../../../../../images/rewards/vip.svg';
import {
  VIP_GOLD_BORDER_DEFAULT,
  VIP_GOLD_BACKGROUND_GRADIENT_COLORS,
  VIP_GOLD_PROGRESS_GRADIENT_COLORS,
  VIP_GOLD_TEXT_MUTED,
} from './Vip.constants';

export const VIP_TIER_PROGRESS_CARD_TEST_IDS = {
  CONTAINER: 'vip-tier-progress-card',
  BORDER: 'vip-tier-progress-card-border',
  GRADIENT: 'vip-tier-progress-card-gradient',
  PROGRAM: 'vip-tier-progress-card-program',
  PROGRESS_BAR: 'vip-tier-progress-card-bar',
  PROGRESS_FILL: 'vip-tier-progress-card-fill',
  SUBLINE: 'vip-tier-progress-card-subline',
} as const;

interface VipTierProgressCardProps {
  currentTier: VipTierRefDto;
  programName?: string;
  progress: VipProgressDto;
  subline: string;
  memberIdTitle: string;
  memberId: string;
  onPress?: () => void;
}

const clampPercent = (value: number): number =>
  Math.max(0, Math.min(100, value));

const vipTierProgressCardBorderStyle = {
  borderWidth: 1,
  borderColor: VIP_GOLD_BORDER_DEFAULT,
};

const VipTierProgressCard: React.FC<VipTierProgressCardProps> = ({
  currentTier,
  programName,
  progress,
  subline,
  memberIdTitle,
  memberId,
  onPress,
}) => {
  const tw = useTailwind();
  const fillWidth: `${number}%` = `${clampPercent(progress.percent)}%`;
  const gradientColors = VIP_GOLD_BACKGROUND_GRADIENT_COLORS;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={tw.style('rounded-2xl')}
      testID={VIP_TIER_PROGRESS_CARD_TEST_IDS.CONTAINER}
    >
      <Box
        twClassName="rounded-2xl overflow-hidden"
        style={vipTierProgressCardBorderStyle}
        testID={VIP_TIER_PROGRESS_CARD_TEST_IDS.BORDER}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          locations={[0, 0.9]}
          style={tw.style('bg-section')}
          testID={VIP_TIER_PROGRESS_CARD_TEST_IDS.GRADIENT}
        >
          <Box twClassName="p-4 gap-4">
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Between}
            >
              <VipIcon width={32} height={32} name="VipIcon" />
              {memberId && (
                <Box twClassName="items-end">
                  <Text
                    variant={TextVariant.BodySm}
                    fontWeight={FontWeight.Medium}
                    style={{ color: VIP_GOLD_TEXT_MUTED }}
                  >
                    {memberIdTitle}
                  </Text>
                  <Text
                    variant={TextVariant.BodySm}
                    fontWeight={FontWeight.Medium}
                    style={{ color: VIP_GOLD_TEXT_MUTED }}
                  >
                    {memberId}
                  </Text>
                </Box>
              )}
            </Box>

            <Box>
              <Text
                variant={TextVariant.HeadingMd}
                fontWeight={FontWeight.Bold}
              >
                {currentTier.name}
              </Text>
              {programName ? (
                <Text
                  variant={TextVariant.BodySm}
                  testID={VIP_TIER_PROGRESS_CARD_TEST_IDS.PROGRAM}
                >
                  {programName}
                </Text>
              ) : null}
            </Box>
            <Box twClassName="gap-1">
              <Box
                twClassName="h-3 rounded-full bg-muted overflow-hidden"
                testID={VIP_TIER_PROGRESS_CARD_TEST_IDS.PROGRESS_BAR}
              >
                <LinearGradient
                  colors={VIP_GOLD_PROGRESS_GRADIENT_COLORS}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    tw.style('h-full rounded-full'),
                    { width: fillWidth },
                  ]}
                  testID={VIP_TIER_PROGRESS_CARD_TEST_IDS.PROGRESS_FILL}
                />
              </Box>

              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                testID={VIP_TIER_PROGRESS_CARD_TEST_IDS.SUBLINE}
              >
                {subline}
              </Text>
            </Box>
          </Box>
        </LinearGradient>
      </Box>
    </Pressable>
  );
};

export default VipTierProgressCard;
