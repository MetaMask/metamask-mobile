import React, { useState } from 'react';
import { type LayoutChangeEvent, Pressable, View } from 'react-native';
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
import { formatCompactValue } from '../../utils/formatUtils';
import {
  VIP_GOLD_BORDER_DEFAULT,
  VIP_GOLD_BACKGROUND_GRADIENT_COLORS,
  VIP_GOLD_PROGRESS_GRADIENT_COLORS,
  VIP_GOLD_TEXT_DEFAULT,
  VIP_GOLD_TEXT_MUTED,
} from './Vip.constants';
import { useTheme } from '../../../../../util/theme';
import { AppThemeKey } from '../../../../../util/theme/models';

export const VIP_TIER_PROGRESS_CARD_TEST_IDS = {
  CONTAINER: 'vip-tier-progress-card',
  BORDER: 'vip-tier-progress-card-border',
  GRADIENT: 'vip-tier-progress-card-gradient',
  PROGRAM: 'vip-tier-progress-card-program',
  PROGRESS_BAR: 'vip-tier-progress-card-bar',
  PROGRESS_FILL: 'vip-tier-progress-card-fill',
  PROGRESS_POINTER: 'vip-tier-progress-card-pointer',
  PROGRESS_POINTER_LABEL: 'vip-tier-progress-card-pointer-label',
  SUBLINE: 'vip-tier-progress-card-subline',
  MAINTAIN_SUBLINE: 'vip-tier-progress-card-maintain-subline',
} as const;

interface VipTierProgressCardProps {
  currentTier: VipTierRefDto;
  programName?: string;
  progress: VipProgressDto;
  /** Rolling 30d points from dashboard.volume.points — shown on the progress pointer. */
  currentPoints: number;
  subline: string;
  /**
   * Optional secondary line under `subline` stating the points needed to
   * maintain the current tier (e.g. "250K points to maintain this tier").
   * Rendered only when non-empty — omitted for tier-1/unset tiers and in
   * environments where no maintain threshold is configured.
   */
  maintainSubline?: string;
  memberIdTitle: string;
  memberId: string;
  onPress?: () => void;
}

const POINTER_LABEL_WIDTH = 40;

const clampPercent = (value: number): number =>
  Math.max(0, Math.min(100, value));

/**
 * `textAlign` must follow `translateX`: the label box is a fixed width, so
 * centered text would drift away from the triangle once the box is shifted to
 * stay inside the track.
 */
const getPointerLabelPlacement = (
  percent: number,
  progressBarWidth: number,
): { translateX: number; textAlign: 'left' | 'center' | 'right' } => {
  const pointerPosition = (percent / 100) * progressBarWidth;

  if (pointerPosition <= POINTER_LABEL_WIDTH) {
    return { translateX: 0, textAlign: 'left' };
  }
  if (pointerPosition >= progressBarWidth - POINTER_LABEL_WIDTH) {
    return { translateX: -POINTER_LABEL_WIDTH, textAlign: 'right' };
  }
  return { translateX: -POINTER_LABEL_WIDTH / 2, textAlign: 'center' };
};

const vipTierProgressCardBorderStyle = {
  borderWidth: 1,
  borderColor: VIP_GOLD_BORDER_DEFAULT,
};

const vipGoldTextMutedStyle = { color: VIP_GOLD_TEXT_MUTED };

const vipGoldTextDefaultStyle = { color: VIP_GOLD_TEXT_DEFAULT };

const pointerTriangleStyle = {
  width: 0,
  height: 0,
  borderLeftWidth: 5,
  borderRightWidth: 5,
  borderTopWidth: 6,
  borderLeftColor: 'transparent',
  borderRightColor: 'transparent',
  borderTopColor: VIP_GOLD_TEXT_DEFAULT,
};

const progressPointerStyle = {
  bottom: 12,
  transform: [{ translateX: -5 }],
  width: 10,
};

const progressPointerLabelStyle = {
  position: 'absolute' as const,
  bottom: 6,
  left: 5,
  width: POINTER_LABEL_WIDTH,
};

const VipTierProgressCard: React.FC<VipTierProgressCardProps> = ({
  currentTier,
  programName,
  progress,
  currentPoints,
  subline,
  maintainSubline,
  memberIdTitle,
  memberId,
  onPress,
}) => {
  const tw = useTailwind();
  const { themeAppearance } = useTheme();
  const [progressBarWidth, setProgressBarWidth] = useState(0);
  const mutedTextStyle =
    themeAppearance === AppThemeKey.dark ? vipGoldTextMutedStyle : undefined;
  const mutedTextColor =
    themeAppearance === AppThemeKey.dark
      ? undefined
      : TextColor.TextAlternative;
  const fillPercent = clampPercent(progress.percent);
  const fillWidth: `${number}%` = `${fillPercent}%`;
  const pointerLeft: `${number}%` = `${fillPercent}%`;
  const pointerLabelPlacement = getPointerLabelPlacement(
    fillPercent,
    progressBarWidth,
  );
  const gradientColors = VIP_GOLD_BACKGROUND_GRADIENT_COLORS;
  const pointsLabel = formatCompactValue(currentPoints);
  const handleProgressBarLayout = (event: LayoutChangeEvent) => {
    setProgressBarWidth(event.nativeEvent.layout.width);
  };

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
                    color={mutedTextColor}
                    style={mutedTextStyle}
                  >
                    {memberIdTitle}
                  </Text>
                  <Text
                    variant={TextVariant.BodySm}
                    fontWeight={FontWeight.Medium}
                    color={mutedTextColor}
                    style={mutedTextStyle}
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
              <Box twClassName="relative pt-5">
                <Box
                  twClassName="absolute items-center"
                  style={[progressPointerStyle, { left: pointerLeft }]}
                  testID={VIP_TIER_PROGRESS_CARD_TEST_IDS.PROGRESS_POINTER}
                >
                  <Text
                    variant={TextVariant.BodyXs}
                    fontWeight={FontWeight.Bold}
                    style={[
                      vipGoldTextDefaultStyle,
                      progressPointerLabelStyle,
                      {
                        textAlign: pointerLabelPlacement.textAlign,
                        transform: [
                          { translateX: pointerLabelPlacement.translateX },
                        ],
                      },
                    ]}
                    testID={
                      VIP_TIER_PROGRESS_CARD_TEST_IDS.PROGRESS_POINTER_LABEL
                    }
                  >
                    {pointsLabel}
                  </Text>
                  <View style={pointerTriangleStyle} />
                </Box>
                <Box
                  twClassName="h-3 rounded-full bg-muted overflow-hidden"
                  onLayout={handleProgressBarLayout}
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
              </Box>
              <Box>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                  testID={VIP_TIER_PROGRESS_CARD_TEST_IDS.SUBLINE}
                >
                  {subline}
                </Text>
                {maintainSubline ? (
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                    testID={VIP_TIER_PROGRESS_CARD_TEST_IDS.MAINTAIN_SUBLINE}
                  >
                    {maintainSubline}
                  </Text>
                ) : null}
              </Box>
            </Box>
          </Box>
        </LinearGradient>
      </Box>
    </Pressable>
  );
};

export default VipTierProgressCard;
