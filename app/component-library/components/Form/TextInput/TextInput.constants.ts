/* eslint-disable import/prefer-default-export */

// External dependencies.
import { DEFAULT_TEXT_VARIANT } from '../../Texts/Text/Text.constants';

// Internal dependencies.
import { TextInputProps } from './TextInput.types';

// Test IDs
export const TEXTINPUT_TEST_ID = 'textinput';

// Sample consts
export const SAMPLE_TEXTINPUT_PROPS: TextInputProps = {
  textVariant: DEFAULT_TEXT_VARIANT,
  disabled: false,
  disableStateStyles: false,
};
