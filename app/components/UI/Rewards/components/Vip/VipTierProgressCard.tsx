import React from 'react';
import { Pressable } from 'react-native';
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

export const VIP_TIER_PROGRESS_CARD_TEST_IDS = {
  CONTAINER: 'vip-tier-progress-card',
  PROGRESS_BAR: 'vip-tier-progress-card-bar',
  PROGRESS_FILL: 'vip-tier-progress-card-fill',
  SUBLINE: 'vip-tier-progress-card-subline',
} as const;

interface VipTierProgressCardProps {
  currentTier: VipTierRefDto;
  progress: VipProgressDto;
  subline: string;
  onPress?: () => void;
}

const clampPercent = (value: number): number =>
  Math.max(0, Math.min(100, value));

const VipTierProgressCard: React.FC<VipTierProgressCardProps> = ({
  currentTier,
  progress,
  subline,
  onPress,
}) => {
  const tw = useTailwind();
  const fillWidth: `${number}%` = `${clampPercent(progress.percent)}%`;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={tw.style('bg-section rounded-2xl p-4 gap-3')}
      testID={VIP_TIER_PROGRESS_CARD_TEST_IDS.CONTAINER}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
      >
        <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
          {currentTier.name}
        </Text>
        <Icon
          name={IconName.ArrowRight}
          size={IconSize.Md}
          color={IconColor.IconAlternative}
        />
      </Box>

      <Box
        twClassName="h-2 rounded-full bg-muted overflow-hidden"
        testID={VIP_TIER_PROGRESS_CARD_TEST_IDS.PROGRESS_BAR}
      >
        <Box
          twClassName="h-full rounded-full bg-success-default"
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
    </Pressable>
  );
};

export default VipTierProgressCard;
