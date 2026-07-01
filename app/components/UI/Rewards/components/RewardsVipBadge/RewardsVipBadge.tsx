import React, { type ReactNode } from 'react';
import VipIcon from '../../../../../images/rewards/vip.svg';
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

export const RewardsDiscountBadge: React.FC<{
  label: string;
  startIcon?: ReactNode;
  testID?: string;
}> = ({ label, startIcon, testID = 'rewards-discount-badge' }) => {
  const tw = useTailwind();

  return (
    <Box twClassName="h-[24px] items-center" testID={testID}>
      <LinearGradient
        useAngle
        angle={169}
        angleCenter={{ x: 0.5, y: 0.7 }}
        locations={[0.3, 0.9]}
        // eslint-disable-next-line @metamask/design-tokens/color-no-hex
        colors={['#EAD797', '#EAD79700']}
        style={tw.style('flex-1 w-full h-full rounded-[4px] p-[1px]')}
      >
        <Box twClassName="rounded-[4px] bg-default">
          <Box twClassName="filter blur-sm max-w-min w-min flex flex-row rounded-sm whitespace-nowrap px-2 py-0 gap-1 bg-warning-default bg-opacity-10 items-center">
            {startIcon}
            <Text variant={TextVariant.BodyXs} fontWeight={FontWeight.Medium}>
              {label}
            </Text>
          </Box>
        </Box>
      </LinearGradient>
    </Box>
  );
};

const RewardsVipBadge: React.FC = () => {
  const vipTier = useVipTier();

  if (!vipTier) return null;

  return (
    <RewardsDiscountBadge
      testID="rewards-vip-badge"
      startIcon={<VipIcon name="VipIcon" width={14} height={14} />}
      label={strings('rewards.vip.badge_label', {
        tier: vipTier.toString(),
      })}
    />
  );
};

export default RewardsVipBadge;
