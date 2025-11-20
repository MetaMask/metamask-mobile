import { BoxProps } from '@metamask/design-system-react-native';
/**
 * Props for the BalanceEmptyState smart component
 */
export interface BalanceEmptyStateProps extends Omit<BoxProps, 'children'> {
  /**
   * Test ID for component testing
   * @default 'balance-empty-state'
   */
  testID?: string;
}
