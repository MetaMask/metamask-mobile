import React from 'react';
import { Box, BoxBackgroundColor } from '@metamask/design-system-react-native';

/**
 * SectionSeparator - A full-width visual separator between homepage sections.
 *
 * Renders an 8px tall bar with muted background color, with 16px vertical padding.
 * Used to visually separate different groups of sections on the homepage.
 */
const SectionSeparator = () => (
  <Box paddingVertical={4}>
    <Box
      backgroundColor={BoxBackgroundColor.BackgroundMuted}
      twClassName="h-2 w-full"
    />
  </Box>
);

export default SectionSeparator;
