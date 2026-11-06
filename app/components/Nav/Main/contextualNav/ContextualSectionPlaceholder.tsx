import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Box,
  BoxAlignItems,
  BoxBackgroundColor,
  BoxJustifyContent,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';

export interface ContextualSectionPlaceholderProps {
  title: string;
}

/**
 * Stand-in body for a contextual tab that does not have a screen yet.
 */
const ContextualSectionPlaceholder = ({
  title,
}: ContextualSectionPlaceholderProps) => {
  const { top: topInset } = useSafeAreaInsets();

  return (
    <Box
      backgroundColor={BoxBackgroundColor.BackgroundDefault}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      padding={4}
      twClassName="flex-1"
      style={{ paddingTop: topInset }}
      testID="contextual-section-placeholder"
    >
      <Text variant={TextVariant.HeadingMd} accessibilityRole="header">
        {title}
      </Text>
    </Box>
  );
};

export default ContextualSectionPlaceholder;
