// External dependencies.
import { ViewStyle, GestureResponderEvent } from 'react-native';
import { PickerBaseProps } from '../PickerBase';

/**
 * PickerAccount component props.
 */
export interface PickerAccountProps
  extends Omit<PickerBaseProps, 'children' | 'onPress'> {
  /**
   * An Ethereum wallet address.
   */
  accountAddress: string;
  /**
   * Name of the account.
   */
  accountName: string;
  /**
   * Show address.
   */
  showAddress?: boolean;
  /**
   * cell account contianer style.
   */
  cellAccountContainerStyle?: ViewStyle;

  /**
   * Account type label.
   */
  accountTypeLabel?: string | null;

  /**
   * Extends the touchable area for accessibility.
   */
  hitSlop?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };

  /**
   * Function to trigger when pressed.
   */
  onPress?: (event: GestureResponderEvent) => void;

  /**
   * Function to trigger when press in.
   */
  onPressIn?: (event: GestureResponderEvent) => void;

  /**
   * Function to trigger when press out.
   */
  onPressOut?: (event: GestureResponderEvent) => void;
}

/**
 * Style sheet input parameters.
 */
export type PickerAccountStyleSheetVars = Pick<
  PickerAccountProps,
  'style' | 'cellAccountContainerStyle'
> & {
  pressed: boolean;
};
