/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
// External dependencies.
import {
  DEFAULT_BUTTON_SIZE,
  DEFAULT_BUTTON_WIDTH,
} from '../../Button.constants';
import { ButtonBaseProps } from './ButtonBase.types';
import { IconName, IconSize } from '../../../../Icons/Icon';
import { ButtonSize, ButtonWidthTypes } from '../../Button.types';
import { TextVariant, TextColor } from '../../../../Texts/Text';

// Defaults
export const DEFAULT_BUTTONBASE_LABEL_COLOR = TextColor.Default;
export const DEFAULT_BUTTONBASE_SIZE = DEFAULT_BUTTON_SIZE;
export const DEFAULT_BUTTONBASE_WIDTH = DEFAULT_BUTTON_WIDTH;
export const DEFAULT_BUTTONBASE_ICON_SIZE = IconSize.Sm;
export const DEFAULT_BUTTONBASE_LABEL_TEXTVARIANT = TextVariant.BodyMD;

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
