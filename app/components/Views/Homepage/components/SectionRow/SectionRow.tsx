import React, { ComponentProps } from 'react';
import { Box } from '@metamask/design-system-react-native';

interface SectionRowProps {
  /**
   * Content to render inside the section row
   */
  children: React.ReactNode;
  /**
   * Test ID for the component
   */
  testID?: string;
  /**
   * Optional gap between children (uses Box spacing tokens, e.g. gap={3} = 12px).
   */
  gap?: ComponentProps<typeof Box>['gap'];
}

/**
 * SectionRow - Provides consistent horizontal padding for section content
 *
 * Use this wrapper for content that needs standard section padding.
 */
const SectionRow = ({ children, testID, gap }: SectionRowProps) => (
  <Box paddingHorizontal={4} testID={testID} gap={gap}>
    {children}
  </Box>
);

export default SectionRow;
