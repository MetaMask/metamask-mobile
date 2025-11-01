// Third party dependencies
import { ReactNode } from 'react';

// External dependencies
import {
  ButtonProps,
  ButtonVariant,
} from '@metamask/design-system-react-native';

/**
 * Individual QuickActionButton component props
 */
export interface QuickActionButtonProps
  extends Omit<ButtonProps, 'children' | 'variant'> {
  /**
   * The content to display inside the button (required for QuickActionButton)
   */
  children: ReactNode;
  /**
   * The variant of the QuickActionButton
   * TODO: this isn't necessary after we import MMDS version with this fix https://github.com/MetaMask/metamask-design-system/pull/806
   */
  variant?: ButtonVariant;
}
