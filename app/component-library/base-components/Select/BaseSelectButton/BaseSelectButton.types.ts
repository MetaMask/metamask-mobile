// External dependencies.
import { IconSize } from '../../../components/Icons/Icon';

// Internal dependencies.
import { BaseSelectableButtonProps } from '../../Selectable/BaseSelectableButton/BaseSelectableButton.types';

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

/**
 * BaseSelectButton component props.
 */
export interface BaseSelectButtonProps extends BaseSelectableButtonProps {
  /**
   * Optional enum to select between SelectButton sizes.
   * @default Md
   */
  size?: SelectButtonSize;
}

/**
 * Style sheet BaseSelectButton parameters.
 */
export type BaseSelectButtonStyleSheetVars = Pick<
  BaseSelectButtonProps,
  'style'
> & {
  size: SelectButtonSize;
  isDisabled: boolean;
  isDanger: boolean;
};
