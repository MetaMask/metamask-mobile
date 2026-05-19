import React from 'react';
import { Pressable } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
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
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type {
  VipProgressDto,
  VipTierRefDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import { colorWithOpacity } from '../../../../../util/colors';
import { useTheme } from '../../../../../util/theme';

export const VIP_TIER_PROGRESS_CARD_TEST_IDS = {
  CONTAINER: 'vip-tier-progress-card',
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
  onPress?: () => void;
}

const clampPercent = (value: number): number =>
  Math.max(0, Math.min(100, value));

const WARNING_GRADIENT_OPACITY = 0.5;

const VipTierProgressCard: React.FC<VipTierProgressCardProps> = ({
  currentTier,
  programName,
  progress,
  subline,
  onPress,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const fillWidth: `${number}%` = `${clampPercent(progress.percent)}%`;
  const gradientColors = React.useMemo(
    () => [
      'transparent',
      'transparent',
      colorWithOpacity(colors.warning.default, WARNING_GRADIENT_OPACITY),
    ],
    [colors.warning.default],
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={tw.style('rounded-2xl')}
      testID={VIP_TIER_PROGRESS_CARD_TEST_IDS.CONTAINER}
    >
      <LinearGradient
        colors={gradientColors}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={tw.style(
          'bg-section rounded-2xl border border-muted overflow-hidden',
        )}
        testID={VIP_TIER_PROGRESS_CARD_TEST_IDS.GRADIENT}
      >
        <Box twClassName="p-4 gap-4">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
          >
            <Icon
              name={IconName.MetamaskFoxOutline}
              size={IconSize.Lg}
              color={IconColor.WarningDefault}
            />
          </Box>

          <Box twClassName="gap-1">
            <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
              {currentTier.name}
            </Text>
            {programName ? (
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
                testID={VIP_TIER_PROGRESS_CARD_TEST_IDS.PROGRAM}
              >
                {programName}
              </Text>
            ) : null}
          </Box>

          <Box
            twClassName="h-3 rounded-full bg-muted overflow-hidden"
            testID={VIP_TIER_PROGRESS_CARD_TEST_IDS.PROGRESS_BAR}
          >
            <Box
              twClassName="h-full rounded-full bg-warning-default"
              style={{ width: fillWidth }}
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
      </LinearGradient>
    </Pressable>
  );
};

export default VipTierProgressCard;
