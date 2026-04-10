// External dependencies.
import { PickerBaseProps } from '../PickerBase';

/**
 * PickerAccount component props.
 */
export interface PickerAccountProps
  extends Omit<PickerBaseProps, 'children' | 'showDropdownIcon'> {
  /**
   * Name of the account.
   */
  accountName: string;
}

/**
 * Style sheet input parameters.
 */
export type PickerAccountStyleSheetVars = Pick<PickerAccountProps, 'style'> & {
  pressed: boolean;
};
