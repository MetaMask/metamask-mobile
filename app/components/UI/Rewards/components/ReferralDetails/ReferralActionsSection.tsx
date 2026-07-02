import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import { useSelector } from 'react-redux';
import CopyableField from './CopyableField';
import { strings } from '../../../../../../locales/i18n';
import { REFERRAL_LINK_PATH, buildReferralUrl } from '../../utils';
import { selectIsCurrentSubscriptionVipEnabled } from '../../../../../selectors/rewards';
import { selectVipProgramEnabled } from '../../../../../selectors/featureFlagController/vipProgram';
import RewardsVipReferralTag from '../RewardsVipReferralTag/RewardsVipReferralTag';

interface ReferralActionsSectionProps {
  referralCode?: string | null;
  referralCodeLoading: boolean;
  referralCodeError: boolean;
  onCopyCode?: () => void;
  onCopyLink?: (link: string) => void;
}

const ReferralActionsSection: React.FC<ReferralActionsSectionProps> = ({
  referralCode = undefined,
  referralCodeLoading,
  referralCodeError,
  onCopyCode,
  onCopyLink,
}) => {
  const isVipProgramEnabled = useSelector(selectVipProgramEnabled);
  const isSubscriptionVipEnabled = useSelector(
    selectIsCurrentSubscriptionVipEnabled,
  );
  const showVipReferralTag =
    isVipProgramEnabled &&
    isSubscriptionVipEnabled &&
    Boolean(referralCode) &&
    !referralCodeLoading;

  // Show error banner when there's an error and not loading
  if (referralCodeError && !referralCodeLoading && !referralCode) {
    return null;
  }

  return (
    <Box twClassName="gap-4">
      <CopyableField
        label={strings('rewards.referral.referral_code')}
        value={referralCode}
        onCopy={onCopyCode}
        valueLoading={referralCodeLoading}
        trailingAccessory={
          showVipReferralTag ? <RewardsVipReferralTag /> : undefined
        }
      />

      <CopyableField
        label={strings('rewards.referral.referral_link')}
        value={
          referralCode ? `${REFERRAL_LINK_PATH}${referralCode}` : undefined
        }
        onCopy={() =>
          referralCode ? onCopyLink?.(buildReferralUrl(referralCode)) : null
        }
        valueLoading={referralCodeLoading}
      />
    </Box>
  );
};

export default ReferralActionsSection;
