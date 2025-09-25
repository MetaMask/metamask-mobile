import React from 'react';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import CopyableField from './CopyableField';
import { strings } from '../../../../../../locales/i18n';
interface ReferralActionsSectionProps {
  referralCode?: string | null;
  referralCodeLoading: boolean;
  onCopyCode?: () => void;
  onCopyLink?: (link: string) => void;
  onShareLink?: (link: string) => void;
}

const ReferralActionsSection: React.FC<ReferralActionsSectionProps> = ({
  referralCode = undefined,
  referralCodeLoading,
  onCopyCode,
  onCopyLink,
  onShareLink,
}) => (
  <Box twClassName="gap-4">
    <CopyableField
      label="Your Referral Code"
      value={referralCode}
      onCopy={onCopyCode}
      valueLoading={referralCodeLoading}
    />

    <CopyableField
      label="Your Referral Link"
      value={referralCode ? `https://mm.io/invite/${referralCode}` : undefined}
      onCopy={() =>
        referralCode
          ? onCopyLink?.(`https://mm.io/invite/${referralCode}`)
          : null
      }
      valueLoading={referralCodeLoading}
    />

    <Button
      variant={ButtonVariant.Primary}
      isFullWidth
      size={ButtonSize.Lg}
      onPress={() =>
        referralCode
          ? onShareLink?.(`https://mm.io/invite/${referralCode}`)
          : null
      }
      disabled={!onShareLink || !referralCode || referralCodeLoading}
    >
      {strings('rewards.referral.actions.share_referral_link')}
    </Button>
  </Box>
);

export default ReferralActionsSection;
