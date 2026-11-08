import {
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import React from 'react';
import { strings } from '../../../../../locales/i18n';

export const X_TRUST_MARK_TEST_ID = 'social-x-trust-mark';

export interface XTrustMarkProps {
  testID?: string;
  /**
   * When a parent control already announces the connection, hide this icon
   * from the accessibility tree so it is not read twice.
   */
  accessible?: boolean;
}

/**
 * Small X mark beside a display name when that trader is connected to X.
 * Decorative trust signal. It does not open a profile or an X link.
 */
const XTrustMark: React.FC<XTrustMarkProps> = ({
  testID = X_TRUST_MARK_TEST_ID,
  accessible = true,
}) => (
  <Icon
    name={IconName.X}
    size={IconSize.Sm}
    color={IconColor.IconDefault}
    testID={testID}
    accessible={accessible}
    accessibilityRole="image"
    accessibilityLabel={strings(
      'social_leaderboard.trader_profile.x_connected',
    )}
    importantForAccessibility={accessible ? 'yes' : 'no'}
    twClassName="shrink-0"
  />
);

export default XTrustMark;
