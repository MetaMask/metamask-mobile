/* eslint-disable import/prefer-default-export */

// External dependencies.
import { TextVariant, TextColor } from '../Texts/Text';

// Internal dependencies.
import { RadioButtonProps } from './RadioButton.types';

// TestIDs
export const RADIOBUTTON_ICON_TESTID = 'RadioButton-icon-component';

// Defaults
export const DEFAULT_RADIOBUTTON_LABEL_TEXTVARIANT = TextVariant.BodyMD;
export const DEFAULT_RADIOBUTTON_LABEL_TEXTCOLOR = TextColor.Default;

// Sample
export const SAMPLE_RADIOBUTTON_PROPS: RadioButtonProps = {
  label: 'Sample RadioButton Label',
  isChecked: false,
  isDisabled: false,
  isReadOnly: false,
  isDanger: false,
};
