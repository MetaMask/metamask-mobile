// External dependencies.
import { IconSize } from '../../../../Icons/Icon';
import { AvatarSize } from '../../../../Avatars/Avatar';

// Internal dependencies.
import { DropdownButtonBaseProps } from './foundation/DropdownButtonBase.types';

/**
 * DropdownButton sizes
 */
export enum DropdownButtonSize {
  Sm = 'Sm',
  Md = 'Md',
  Lg = 'Lg',
}

/**
 * Mapping of Caret IconSize by DropdownButtonSize.
 */
export type CaretIconIconSizeByDropdownButtonSize = {
  [key in DropdownButtonSize]: IconSize;
};

export type StartIconIconSizeByDropdownButtonSize = {
  [key in DropdownButtonSize]: AvatarSize;
};

/**
 * DropdownButton component props.
 */
export interface DropdownButtonProps extends DropdownButtonBaseProps {
  /**
   * Optional enum to select between DropdownButton sizes.
   * @default Md
   */
  size?: DropdownButtonSize;
  /**
   * Optional prop to configure the danger state.
   */
  isDanger?: boolean;
}

/**
 * Style sheet DropdownButton parameters.
 */
export type DropdownButtonStyleSheetVars = Pick<
  DropdownButtonProps,
  'style'
> & {
  size: DropdownButtonSize;
  isDisabled: boolean;
  isDanger: boolean;
};
