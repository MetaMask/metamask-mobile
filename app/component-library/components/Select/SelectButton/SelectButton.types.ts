// External dependencies.
import { IconSize } from '../../Icons/Icon';

// Internal dependencies.
import { SelectButtonBaseProps } from './foundation/SelectButtonBase.types';

/**
 * SelectButton sizes
 */
export enum SelectButtonSize {
  Sm = 'Sm',
  Md = 'Md',
  Lg = 'Lg',
}

/**
 * Mapping of IconSize by SelectButtonSize.
 */
export type IconSizeBySelectButtonSize = {
  [key in SelectButtonSize]: IconSize;
};

/**
 * SelectButton component props.
 */
export interface SelectButtonProps extends SelectButtonBaseProps {
  /**
   * Optional enum to select between SelectButton sizes.
   * @default Md
   */
  size?: SelectButtonSize;
  /**
   * Optional prop to configure the disabled state.
   */
  isDisabled?: boolean;
  /**
   * Optional prop to configure the danger state.
   */
  isDanger?: boolean;
}

/**
 * Style sheet SelectButton parameters.
 */
export type SelectButtonStyleSheetVars = Pick<SelectButtonProps, 'style'> & {
  size: SelectButtonSize;
  isDisabled: boolean;
  isDanger: boolean;
};
