import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxBackgroundColor,
  BoxFlexDirection,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';

interface PrivacySectionProps {
  children?: React.ReactNode;
}

function PrivacySection({ children }: Readonly<PrivacySectionProps>) {
  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Start}
      gap={2}
      backgroundColor={BoxBackgroundColor.BackgroundMuted}
      paddingHorizontal={4}
      paddingVertical={2}
      marginVertical={2}
      twClassName="rounded-lg"
    >
      <Icon
        name={IconName.SecurityKey}
        size={IconSize.Lg}
        color={IconColor.IconAlternative}
      />
      <Box twClassName="min-w-0 flex-1">
        {children ?? (
          <>
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
            >
              {strings('deposit.privacy_section.transak')}
            </Text>
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
            >
              {strings('deposit.privacy_section.metamask')}
            </Text>
          </>
        )}
      </Box>
    </Box>
  );
}

export default PrivacySection;
