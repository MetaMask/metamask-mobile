import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';

export interface SocialEmptyStateProps {
  description: string;
  testID?: string;
}

/**
 * Shared Social empty state: the description only, 48px below the content top.
 */
const SocialEmptyState: React.FC<SocialEmptyStateProps> = ({
  description,
  testID,
}) => (
  <Box twClassName="w-full px-6 pt-12" testID={testID}>
    <Text
      variant={TextVariant.BodyMd}
      color={TextColor.TextAlternative}
      twClassName="text-center"
    >
      {description}
    </Text>
  </Box>
);

export default SocialEmptyState;
