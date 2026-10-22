import {
  FontWeight,
  Tag,
  TagSeverity,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { colors } from '../../../../../styles/common';

/**
 * Orange tint behind the chip: the warning-default colour at 10% opacity that
 * the Member badge (RewardsDiscountBadge) uses.
 */
export const PERPS_ORANGE_TINT_CLASS_NAME = 'bg-warning-default bg-opacity-10';

const styles = StyleSheet.create({
  // Member orange from MembershipVipBadge; the design system has no token.
  text: {
    color: colors.rewardsMemberLabel,
  },
});

export interface PerpsOrangeChipProps {
  testID?: string;
}

/**
 * "Orange" plan chip for subscription-priced fees. The Isolated chip's shape
 * (a neutral Tag: padding, radius, BodyXs medium text) with the Member
 * badge's orange text and tint.
 */
const PerpsOrangeChip: React.FC<PerpsOrangeChipProps> = ({ testID }) => (
  <Tag
    severity={TagSeverity.Neutral}
    twClassName={PERPS_ORANGE_TINT_CLASS_NAME}
    testID={testID}
  >
    {/* Same text variant and weight Tag gives a string child. */}
    <Text
      variant={TextVariant.BodyXs}
      fontWeight={FontWeight.Medium}
      style={styles.text}
    >
      {strings('pro_subscription.pro')}
    </Text>
  </Tag>
);

export default PerpsOrangeChip;
