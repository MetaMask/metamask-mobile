import React from 'react';
import { Box } from '@metamask/design-system-react-native';

type BoxComponentProps = React.ComponentProps<typeof Box>;
/**
 * Props for the BalanceEmptyState smart component
 */
export interface BalanceEmptyStateProps
  extends Omit<BoxComponentProps, 'children'> {
  /**
   * Test ID for component testing
   * @default 'balance-empty-state'
   */
  testID?: string;
}
