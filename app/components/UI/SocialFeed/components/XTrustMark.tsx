import {
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import React from 'react';

export const X_TRUST_MARK_TEST_ID = 'social-x-trust-mark';

/**
 * Small X mark beside a display name when that trader is connected to X.
 * Decorative. It does not open a profile or an X link.
 */
const XTrustMark: React.FC = () => (
  <Icon
    name={IconName.X}
    size={IconSize.Sm}
    color={IconColor.IconDefault}
    testID={X_TRUST_MARK_TEST_ID}
    accessible={false}
    importantForAccessibility="no"
    twClassName="shrink-0"
  />
);

export default XTrustMark;
