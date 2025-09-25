import React from 'react';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import CopyableField from './CopyableField';
import { strings } from '../../../../../../locales/i18n';

const REFERRAL_LINK_PATH = 'link.metamask.io/rewards?referral=';
const REFERRAL_BASE_URL = `https://${REFERRAL_LINK_PATH}`;

const buildReferralUrl = (referralCode: string): string =>
  `${REFERRAL_BASE_URL}${referralCode}`;

interface ReferralActionsSectionProps {
  referralCode?: string | null;
  referralCodeLoading: boolean;
  referralCodeError: boolean;
  onCopyCode?: () => void;
  onCopyLink?: (link: string) => void;
  onShareLink?: (link: string) => void;
}

const ReferralActionsSection: React.FC<ReferralActionsSectionProps> = ({
  referralCode = undefined,
  referralCodeLoading,
  referralCodeError,
  onCopyCode,
  onCopyLink,
  onShareLink,
}) => {
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

      <Button
        variant={ButtonVariant.Primary}
        isFullWidth
        size={ButtonSize.Lg}
        onPress={() =>
          referralCode ? onShareLink?.(buildReferralUrl(referralCode)) : null
        }
        disabled={!onShareLink || !referralCode || referralCodeLoading}
      >
        {strings('rewards.referral.actions.share_referral_link')}
      </Button>
    </Box>
  );
};

export default ReferralActionsSection;
