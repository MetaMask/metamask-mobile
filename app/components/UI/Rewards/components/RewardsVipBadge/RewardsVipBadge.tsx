import React from 'react';
import FoxRewardIcon from '../../../../../images/rewards/metamask-rewards-points-vip.svg';
import { strings } from '../../../../../../locales/i18n';
import {
  Box,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useVipTier } from '../../hooks/useVipTier';

const RewardsVipBadge: React.FC = () => {
  const tw = useTailwind();
  const vipTier = useVipTier();

  if (!vipTier) return null;

  return (
    <Box twClassName="h-[24px] items-center" testID="rewards-vip-badge">
      <LinearGradient
        useAngle
        angle={169}
        angleCenter={{ x: 0.5, y: 0.7 }}
        locations={[0.3, 0.9]}
        // eslint-disable-next-line @metamask/design-tokens/color-no-hex
        colors={['#ECB920', '#ECBC2D00']}
        style={tw.style('flex-1 w-full h-full rounded-[4px] p-[1px]')}
      >
        <Box twClassName="rounded-[4px] bg-default">
          <Box twClassName="filter blur-sm max-w-min w-min flex flex-row rounded-sm whitespace-nowrap px-2 py-0 gap-1 bg-warning-default bg-opacity-10 items-center">
            <FoxRewardIcon name="fox-reward-icon" width={14} height={14} />
            <Text variant={TextVariant.BodyXs} fontWeight={FontWeight.Medium}>
              {strings('rewards.vip.badge_label', {
                tier: vipTier.toString(),
              })}
            </Text>
          </Box>
        </Box>
      </LinearGradient>
    </Box>
  );
};

export default RewardsVipBadge;
