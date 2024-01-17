// External dependencies.
import { IconSize } from '../../Icons/Icon';
import { AvatarSize } from '../../Avatars/Avatar';

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
 * Mapping of Caret IconSize by SelectButtonSize.
 */
export type CaretIconIconSizeBySelectButtonSize = {
  [key in SelectButtonSize]: IconSize;
};

export type StartIconIconSizeBySelectButtonSize = {
  [key in SelectButtonSize]: AvatarSize;
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
