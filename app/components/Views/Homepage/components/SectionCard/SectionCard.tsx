import React from 'react';
import { Box, BoxBackgroundColor } from '@metamask/design-system-react-native';

interface SectionCardProps {
  children: React.ReactNode;
}

const SectionCard = ({ children }: SectionCardProps) => (
  <Box
    backgroundColor={BoxBackgroundColor.BackgroundMuted}
    padding={4}
    twClassName="rounded-xl w-full"
  >
    {children}
  </Box>
);

export default SectionCard;
