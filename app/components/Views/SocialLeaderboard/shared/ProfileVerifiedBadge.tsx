import {
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import React from 'react';
import { strings } from '../../../../../locales/i18n';

/** Non-interactive indicator of server-confirmed profile verification. */
const ProfileVerifiedBadge: React.FC<{ testID: string }> = ({ testID }) => (
  <Icon
    name={IconName.VerifiedFilled}
    color={IconColor.PrimaryDefault}
    size={IconSize.Sm}
    accessible
    accessibilityRole="image"
    accessibilityLabel={strings(
      'social_leaderboard.shell.filters.verification.verified',
    )}
    testID={testID}
    twClassName="shrink-0"
  />
);

export default ProfileVerifiedBadge;
