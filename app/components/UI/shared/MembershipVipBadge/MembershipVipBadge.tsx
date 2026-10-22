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

interface MembershipVipBadgeProps {
  /**
   * True when this fee was priced from a Plus entitlement.
   * Membership wins over a VIP tier, so a subscription-priced fee stays a
   * Member chip even when the account also has a VIP tier.
   * Omitted means only the VIP badge can appear.
   */
  hasProEntitlement?: boolean;
}

const MembershipVipBadge: React.FC<MembershipVipBadgeProps> = ({
  hasProEntitlement = false,
}) => {
  const vipTier = useVipTier();

  if (hasProEntitlement) {
    return (
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
  }

  if (vipTier) {
    return (
      <RewardsDiscountBadge
        testID={MembershipVipBadgeSelectorsIDs.VIP_BADGE}
        startIcon={<VipIcon name="VipIcon" width={14} height={14} />}
        label={strings('rewards.vip.badge_label', {
          tier: vipTier.toString(),
        })}
      />
    );
  }

  return null;
};

export default MembershipVipBadge;
