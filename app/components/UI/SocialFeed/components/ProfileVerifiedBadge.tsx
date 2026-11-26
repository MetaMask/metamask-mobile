import {
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import React from 'react';
import { strings } from '../../../../../locales/i18n';

export const PROFILE_VERIFIED_BADGE_TEST_ID = 'social-profile-verified-badge';

export interface ProfileVerifiedBadgeProps {
  testID?: string;
  size?: IconSize;
}

/** Non-interactive indicator of server-confirmed profile verification. */
const ProfileVerifiedBadge: React.FC<ProfileVerifiedBadgeProps> = ({
  testID = PROFILE_VERIFIED_BADGE_TEST_ID,
  size = IconSize.Sm,
}) => (
  <Icon
    name={IconName.VerifiedFilled}
    color={IconColor.PrimaryDefault}
    size={size}
    accessible
    accessibilityRole="image"
    accessibilityLabel={strings(
      'social_leaderboard.shell.filters.verification.verified',
    )}
    testID={testID}
    className="shrink-0"
  />
);

export default ProfileVerifiedBadge;
