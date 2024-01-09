/* eslint-disable import/prefer-default-export */
// External dependencies.
import { IconName, IconColor, IconSize } from '../../../components/Icons/Icon';

// Internal dependencies.
import {
  SelectButtonSize,
  BaseSelectButtonProps,
  CaretIconIconSizeBySelectButtonSize,
} from './BaseSelectButton.types';

// Defaults
export const DEFAULT_BASESELECTBUTTON_SIZE = SelectButtonSize.Md;
export const DEFAULT_BASESELECTBUTTON_CARETICON_ICONNAME = IconName.ArrowDown;
export const DEFAULT_BASESELECTBUTTON_CARETICON_ICONCOLOR = IconColor.Default;

// Test IDs
export const BASESELECTBUTTON_TESTID = 'selectbutton';

// Mappings
export const CARETICON_ICONSIZE_BY_SELECTBUTTONSIZE: CaretIconIconSizeBySelectButtonSize =
  {
    [SelectButtonSize.Sm]: IconSize.Xs,
    [SelectButtonSize.Md]: IconSize.Sm,
    [SelectButtonSize.Lg]: IconSize.Sm,
  };

// Sample consts
export const SAMPLE_BASESELECTBUTTON_PROPS: BaseSelectButtonProps = {
  size: DEFAULT_BASESELECTBUTTON_SIZE,
  isDisabled: false,
  isDanger: false,
};
