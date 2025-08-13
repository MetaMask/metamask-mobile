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
   * The content to display inside the button
   */
  children: ReactNode;
  /**
   * Callback when the button is pressed
   */
  onPress: () => void;
  /**
   * Whether the button is disabled
   * @default false
   */
  isDisabled?: boolean;
  /**
   * Button variant
   * @default ButtonVariant.Secondary
   */
  variant?: ButtonVariant;
}
