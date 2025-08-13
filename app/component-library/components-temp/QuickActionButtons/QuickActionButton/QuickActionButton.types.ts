// Third party dependencies
import { ReactNode } from 'react';

// External dependencies
import {
  ButtonProps,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';

/**
 * Individual QuickActionButton component props
 */
export interface QuickActionButtonProps
  extends Omit<ButtonProps, 'children' | 'variant' | 'size'> {
  /**
   * The content to display inside the button (required for QuickActionButton)
   */
  children: ReactNode;
  /**
   * Button variant
   * @default ButtonVariant.Secondary
   */
  variant?: ButtonVariant;
  /**
   * Button size
   * @default ButtonSize.Lg
   */
  size?: ButtonSize;
}
