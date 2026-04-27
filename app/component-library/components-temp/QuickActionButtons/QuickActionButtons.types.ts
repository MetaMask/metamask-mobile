// Third party dependencies
import React, { ReactNode } from 'react';

// External dependencies
import { Box } from '@metamask/design-system-react-native';

type BoxComponentProps = React.ComponentProps<typeof Box>;

/**
 * QuickActionButtons container component props
 */
export interface QuickActionButtonsProps extends BoxComponentProps {
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
  rowWrapperProps?: BoxComponentProps;
  /**
   * Props to apply to each button wrapper Box
   */
  buttonWrapperProps?: BoxComponentProps;
  /**
   * Props to apply to spacer elements
   */
  spacerProps?: BoxComponentProps;
}
