import React from 'react';
import {
  AvatarIcon,
  AvatarIconSize,
  Box,
  Card,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';

/**
 * Shown when a user has no benefits. The card, icon and title follow the
 * Rewards opt-in section: a muted surface, the icon centered above the title.
 */
const BenefitEmptyList = () => (
  <Card twClassName="items-center gap-4 py-6">
    <Box twClassName="items-center gap-3">
      {/* The avatar takes the card's own surface, so only the gift shows. */}
      <AvatarIcon
        iconName={IconName.Gift}
        size={AvatarIconSize.Md}
        twClassName="bg-section"
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        twClassName="text-center"
        accessibilityRole="header"
      >
        {strings('rewards.benefits.empty-list')}
      </Text>
    </Box>
  </Card>
);

export default BenefitEmptyList;
