// Third party dependencies
import { ReactNode } from 'react';

// External dependencies
import { BoxProps } from '@metamask/design-system-react-native';

/**
 * QuickActionButtons container component props
 */
export interface QuickActionButtonsProps extends BoxProps {
  /**
   * Child components to render (QuickActionButton or custom components)
   */
  children: ReactNode;
  /**
   * Number of buttons per row
   * @default 4
   */
  buttonsPerRow?: number;
  /**
   * Props to apply to each row wrapper Box
   */
  rowWrapperProps?: BoxProps;
  /**
   * Props to apply to each button wrapper Box
   */
  buttonWrapperProps?: BoxProps;
  /**
   * Props to apply to spacer elements
   */
  spacerProps?: BoxProps;
}
