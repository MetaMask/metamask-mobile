import React from 'react';
import { TextProps } from '@metamask/design-system-react-native';

export interface QRAccountDisplayProps {
  /**
   * The account address to display
   */
  accountAddress: string;
  /**
   * Optional label to display instead of the account name.
   * Can be a string or a React node.
   */
  label?: string | React.ReactNode;
  /**
   * Optional props to pass to the Text component when label is a string
   */
  labelProps?: Partial<TextProps>;
  /**
   * Optional description to display below the label.
   * Can be a string or a React node.
   */
  description?: string | React.ReactNode;
  /**
   * Optional props to pass to the Text component when description is a string
   */
  descriptionProps?: Partial<TextProps>;
  /**
   * Optional location identifier for analytics tracking.
   * When provided, tracks "Copied Address" event with this location.
   */
  analyticsLocation?: string;
  /**
   * Optional chain ID for analytics tracking.
   * Should be in hex format (will be converted to decimal for tracking).
   */
  chainId?: string;
}
