import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
} from '@metamask/design-system-react-native';
import {
  SecurityPill,
  type SecurityVerdict,
} from '../SecurityPill/SecurityPill';
import { SecuritySocialSectionSelectors } from './SecuritySocialSection.testIds';

export interface SecuritySocialSectionProps {
  securityVerdict: SecurityVerdict;
  /** Only read when the verdict is `medium_risk`. */
  securityFlagCount?: number;
  onSecurityPress?: () => void;
}

/**
 * Row below the Token Details V1 header holding the security verdict pill.
 *
 * The social links (X, website, Telegram) and the contract-address chip land
 * here in a follow-up as further children of this same row: all of them sit
 * left-aligned beside the pill and wrap together, rather than being pushed to
 * the trailing edge.
 */
export const SecuritySocialSection: React.FC<SecuritySocialSectionProps> = ({
  securityVerdict,
  securityFlagCount,
  onSecurityPress,
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName="flex-wrap gap-2"
    testID={SecuritySocialSectionSelectors.SECTION}
  >
    <SecurityPill
      verdict={securityVerdict}
      flagCount={securityFlagCount}
      onPress={onSecurityPress}
    />
  </Box>
);

export default SecuritySocialSection;
