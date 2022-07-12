import { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { IconProps } from '../Icon';

export enum ToastVariant {
  Account = 'Account',
  Network = 'Network',
}

/**
 * Toast component props.
 */
export interface ToastProps {
  /**
   * Button text.
   */
  label: string;
  /**
   * Color of label. Applies to icon too.
   */
  labelColor?: string;
  /**
   * Button icon.
   */
  icon?: IconProps['name'];

  /**
   * Escape hatch for applying extra styles. Only use if absolutely necessary.
   */
  style?: StyleProp<ViewStyle>;
}

/**
 * Style sheet input parameters.
 */
export type ToastStyleSheetVars = {};
