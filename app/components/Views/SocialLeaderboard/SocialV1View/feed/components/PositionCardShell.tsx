import { Box } from '@metamask/design-system-react-native';
import React from 'react';

export interface PositionCardShellProps {
  children: React.ReactNode;
}

const PositionCardShell: React.FC<PositionCardShellProps> = ({ children }) => (
  <Box twClassName="bg-default rounded-2xl p-3 gap-3 border border-default">
    {children}
  </Box>
);

export default PositionCardShell;
