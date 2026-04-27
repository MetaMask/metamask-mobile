import React from 'react';
import { Box } from '@metamask/design-system-react-native';

// TODO: @MetaMask/design-system-engineers
// Use the concrete Box component props here instead of BoxProps.
// In MetaMask Mobile, extending BoxProps in forwarding wrappers can fail TS checks
// because consumer code may resolve older @types/react-native callback types while
// MMDS Box resolves React Native bundled types. Deriving props from the component
// keeps wrapper props aligned with the actual JSX contract until the library-level
// typing story is unified.
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
