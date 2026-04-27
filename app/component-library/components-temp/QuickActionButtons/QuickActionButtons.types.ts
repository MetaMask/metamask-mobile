// Third party dependencies
import React, { ReactNode } from 'react';

// External dependencies
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
