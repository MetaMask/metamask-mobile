// External dependencies.
import { GestureResponderEvent } from 'react-native';
import { PickerBaseProps } from '../PickerBase';

/**
 * PickerAccount component props.
 */
export interface PickerAccountProps extends Omit<PickerBaseProps, 'children'> {
  /**
   * An Ethereum wallet address.
   */
  accountAddress: string;
  /**
   * Name of the account.
   */
  accountName: string;
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
}

/**
 * Style sheet input parameters.
 */
export type PickerAccountStyleSheetVars = Pick<PickerAccountProps, 'style'> & {
  pressed: boolean;
};
