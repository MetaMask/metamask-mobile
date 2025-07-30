// External dependencies.
import { ViewStyle } from 'react-native';
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
}

/**
 * Style sheet input parameters.
 */
export type PickerAccountStyleSheetVars = Pick<
  PickerAccountProps,
  'style' | 'cellAccountContainerStyle'
>;
