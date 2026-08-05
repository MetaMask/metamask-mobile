import React from 'react';
import VipIcon from '../../../../../images/rewards/vip.svg';
import { strings } from '../../../../../../locales/i18n';
import { useVipTier } from '../../hooks/useVipTier';
import { RewardsDiscountBadge } from '../RewardsDiscountBadge';

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
