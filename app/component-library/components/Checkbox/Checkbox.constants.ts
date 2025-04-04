/* eslint-disable import/prefer-default-export */

// External dependencies.
import { IconName, IconSize } from '../Icons/Icon';
import { TextVariant, TextColor } from '../Texts/Text';

// Internal dependencies.
import { CheckboxProps } from './Checkbox.types';

// TestIDs
export const CHECKBOX_ICON_TESTID = 'checkbox-icon-component';

// Defaults
export const DEFAULT_CHECKBOX_LABEL_TEXTVARIANT = TextVariant.BodyMD;
export const DEFAULT_CHECKBOX_LABEL_TEXTCOLOR = TextColor.Default;
export const DEFAULT_CHECKBOX_ISINDETERMINATE_ICONNAME = IconName.MinusBold;
export const DEFAULT_CHECKBOX_ISCHECKED_ICONNAME = IconName.CheckBold;
export const DEFAULT_CHECKBOX_ICONSIZE = IconSize.Md;

// Sample
export const SAMPLE_CHECKBOX_PROPS: CheckboxProps = {
  label: 'Sample Checkbox Label',
  isChecked: false,
  isIndeterminate: false,
  isDisabled: false,
  isReadOnly: false,
  isDanger: false,
};
