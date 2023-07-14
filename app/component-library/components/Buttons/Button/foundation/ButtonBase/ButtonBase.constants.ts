/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
// External dependencies.
import { ButtonBaseProps } from './ButtonBase.types';
import { IconName, IconSize } from '../../../../Icons/Icon';
import { ButtonSize, ButtonWidthTypes } from '../../Button.types';

// Defaults
export const DEFAULT_BUTTONBASE_SIZE = ButtonSize.Md;
export const DEFAULT_BUTTONBASE_WIDTH = ButtonWidthTypes.Auto;
export const DEFAULT_BUTTONBASE_ICON_SIZE = IconSize.Sm;

// Samples
export const SAMPLE_BUTTONBASE_PROPS: ButtonBaseProps = {
  label: 'Sample label',
  startIconName: IconName.Add,
  endIconName: IconName.AddSquare,
  size: ButtonSize.Md,
  onPress: () => {
    console.log('Button pressed');
  },
  isDanger: false,
  width: ButtonWidthTypes.Auto,
};
