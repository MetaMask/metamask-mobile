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
  onCopyCode?: () => void;
  onCopyLink?: (link: string) => void;
  onShareLink?: (link: string) => void;
}

const ReferralActionsSection: React.FC<ReferralActionsSectionProps> = ({
  referralCode = '124455',
  onCopyCode,
  onCopyLink,
  onShareLink,
}) => (
  <Box twClassName="gap-4">
    <CopyableField
      label="Your Referral Code"
      value={referralCode}
      onCopy={onCopyCode}
    />

    <CopyableField
      label="Your Referral Link"
      value={`https://mm.io/invite/${referralCode}`}
      onCopy={() => onCopyLink?.(`https://mm.io/invite/${referralCode}`)}
    />

    <Button
      variant={ButtonVariant.Primary}
      isFullWidth
      size={ButtonSize.Lg}
      onPress={() => onShareLink?.(`https://mm.io/invite/${referralCode}`)}
      disabled={!onShareLink || !referralCode}
    >
      {strings('rewards.referral.actions.share_referral_link')}
    </Button>
  </Box>
);

export default ReferralActionsSection;
