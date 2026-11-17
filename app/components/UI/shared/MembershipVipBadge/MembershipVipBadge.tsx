import React from 'react';
import { Image, StyleSheet } from 'react-native';
import VipIcon from '../../../../images/rewards/vip.svg';
import foxIcon from '../../../../images/fox.png';
import { strings } from '../../../../../locales/i18n';
import { useVipTier } from '../../Rewards/hooks/useVipTier';
import { RewardsDiscountBadge } from '../../Rewards/components/RewardsDiscountBadge';
import { colors } from '../../../../styles/common';

const FOX_ICON_SIZE = 14;
const MEMBER_BORDER_COLORS = [
  colors.rewardsMemberOrange,
  colors.rewardsMemberOrangeTransparent,
];

export const MembershipVipBadgeSelectorsIDs = {
  MEMBER_BADGE: 'rewards-member-badge',
  VIP_BADGE: 'rewards-vip-badge',
} as const;

const styles = StyleSheet.create({
  foxIcon: {
    width: FOX_ICON_SIZE,
    height: FOX_ICON_SIZE,
  },
  memberLabel: {
    color: colors.rewardsMemberLabel,
  },
});

export type MembershipVipDiscountKind = 'vip' | 'member';

/**
 * VIP chip. Only this component reads the tier, so member chips never fetch it.
 * Renders nothing when the account has no VIP tier.
 */
const VipBadge: React.FC = () => {
  const vipTier = useVipTier();

  if (!vipTier) {
    return null;
  }

  return (
    <RewardsDiscountBadge
      testID={MembershipVipBadgeSelectorsIDs.VIP_BADGE}
      startIcon={<VipIcon name="VipIcon" width={14} height={14} />}
      label={strings('rewards.vip.badge_label', {
        tier: vipTier.toString(),
      })}
    />
  );
};

const MemberBadge: React.FC = () => (
  <RewardsDiscountBadge
    testID={MembershipVipBadgeSelectorsIDs.MEMBER_BADGE}
    startIcon={
      <Image source={foxIcon} style={styles.foxIcon} resizeMode="contain" />
    }
    label={strings('rewards.pro_member_badge_label')}
    borderColors={MEMBER_BORDER_COLORS}
    labelStyle={styles.memberLabel}
  />
);

interface MembershipVipBadgeProps {
  /**
   * Discount actually applied to this fee.
   * `vip` shows the VIP chip when the account has a tier.
   * `member` always shows the Member chip, even when the account also has a VIP tier.
   */
  discountKind: MembershipVipDiscountKind;
}

const MembershipVipBadge: React.FC<MembershipVipBadgeProps> = ({
  discountKind,
}) => {
  if (discountKind === 'member') {
    return <MemberBadge />;
  }

  return <VipBadge />;
};

export default MembershipVipBadge;
