import React from 'react';
import { Box } from '@metamask/design-system-react-native';

interface SectionRowProps {
  children: React.ReactNode;
}

const SectionRow = ({ children }: SectionRowProps) => (
  <Box paddingHorizontal={4}>{children}</Box>
);

export default SectionRow;
