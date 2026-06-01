import React from 'react';
import { Box } from '@metamask/design-system-react-native';

type BottomPadding = 'pb-2' | 'pb-6';

interface TokenDetailsSectionDividerProps {
  /** Bottom spacing below the divider line. Defaults to pb-6 (24px). */
  bottomPadding?: BottomPadding;
}

/**
 * Section divider with full-bleed line within a px-4 (16px) parent.
 * pt-6 (24px) above the line; bottom padding configurable per call site.
 */
const TokenDetailsSectionDivider = ({
  bottomPadding = 'pb-6',
}: TokenDetailsSectionDividerProps) => (
  <Box twClassName={`${bottomPadding} pt-6 self-stretch -mx-4`}>
    <Box twClassName="h-px bg-border-muted" />
  </Box>
);

export default TokenDetailsSectionDivider;
