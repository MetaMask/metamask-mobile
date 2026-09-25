import { Box } from '@metamask/design-system-react-native';
import React from 'react';

/**
 * Horizontal bleed that cancels the shell's padding, so a full-width rule can
 * reach the card's borders. Kept next to the padding it negates -- the two have
 * to move together, and they live in different components.
 */
export const POSITION_CARD_BLEED_TW_CLASS = '-mx-4';

export interface PositionCardShellProps {
  children: React.ReactNode;
}

const PositionCardShell: React.FC<PositionCardShellProps> = ({ children }) => (
  <Box twClassName="bg-default rounded-2xl p-4 gap-3 border border-muted">
    {children}
  </Box>
);

export default PositionCardShell;
