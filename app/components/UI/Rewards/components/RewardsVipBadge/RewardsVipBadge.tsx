import React from 'react';
import { Image, StyleSheet } from 'react-native';
import VipIcon from '../../../../../images/rewards/vip.svg';
import foxIcon from '../../../../../images/fox.png';
import { strings } from '../../../../../../locales/i18n';
import { useVipTier } from '../../hooks/useVipTier';
import { RewardsDiscountBadge } from '../RewardsDiscountBadge';
import { useIsProSubscriber } from '../../../../../hooks/useIsProSubscriber';
import { useProSubscriptionEnabled } from '../../../../../hooks/useProSubscriptionEnabled';
import { colors } from '../../../../../styles/common';

const FOX_ICON_SIZE = 14;
const MEMBER_BORDER_COLORS = [
  colors.rewardsMemberOrange,
  colors.rewardsMemberOrangeTransparent,
];

const styles = StyleSheet.create({
  foxIcon: {
    width: FOX_ICON_SIZE,
    height: FOX_ICON_SIZE,
  },
  memberLabel: {
    color: colors.rewardsMemberLabel,
  },
});

const RewardsVipBadge: React.FC = () => {
  const vipTier = useVipTier();
  const isProSubscriber = useIsProSubscriber();
  const { isProSubscriptionEnabled } = useProSubscriptionEnabled();

  if (vipTier) {
    return (
      <RewardsDiscountBadge
        testID="rewards-vip-badge"
        startIcon={<VipIcon name="VipIcon" width={14} height={14} />}
        label={strings('rewards.vip.badge_label', {
          tier: vipTier.toString(),
        })}
      />
    );
  }

  if (isProSubscriptionEnabled && isProSubscriber) {
    return (
      <RewardsDiscountBadge
        testID="rewards-member-badge"
        startIcon={
          <Image source={foxIcon} style={styles.foxIcon} resizeMode="contain" />
        }
        label={strings('rewards.pro_member_badge_label')}
        borderColors={MEMBER_BORDER_COLORS}
        labelStyle={styles.memberLabel}
      />
    );
  }

  return null;
};

export default RewardsVipBadge;
