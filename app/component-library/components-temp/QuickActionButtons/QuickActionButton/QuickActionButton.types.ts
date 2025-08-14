// Third party dependencies
import { ReactNode } from 'react';

// External dependencies
import { ButtonProps } from '@metamask/design-system-react-native';

/**
 * Individual QuickActionButton component props
 */
export interface QuickActionButtonProps extends Omit<ButtonProps, 'children'> {
  /**
   * The content to display inside the button (required for QuickActionButton)
   */
  children: ReactNode;
}
