import React from 'react';
import {
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
  Box,
  IconColor,
  IconName,
  TabEmptyState,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';

/**
 * Shown when a user has no benefits. It matches the trading activity empty
 * state: the icon centered above the description, with no action button.
 */
const BenefitEmptyList = () => (
  <Box className="items-center px-4 py-4">
    <TabEmptyState
      icon={
        <AvatarIcon
          iconName={IconName.Gift}
          size={AvatarIconSize.Xl}
          severity={AvatarIconSeverity.Neutral}
          iconProps={{ color: IconColor.IconDefault }}
        />
      }
      description={strings('rewards.benefits.empty-list')}
      descriptionProps={{
        variant: TextVariant.BodyMd,
        color: TextColor.TextAlternative,
      }}
    />
  </Box>
);

export default BenefitEmptyList;
