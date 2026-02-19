import React from 'react';
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
}

/**
 * SectionRow - Provides consistent horizontal padding for section content
 *
 * Use this wrapper for content that needs standard section padding.
 */
const SectionRow = ({ children, testID }: SectionRowProps) => (
  <Box paddingHorizontal={4} testID={testID}>
    {children}
  </Box>
);

export default SectionRow;
