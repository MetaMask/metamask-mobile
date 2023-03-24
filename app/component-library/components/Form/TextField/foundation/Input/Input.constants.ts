/* eslint-disable import/prefer-default-export */

// External dependencies.
import { DEFAULT_TEXT_VARIANT } from '../../../../Texts/Text/Text.constants';

// Internal dependencies.
import { InputProps } from './Input.types';

// Test IDs
export const INPUT_TEST_ID = 'input';

// Sample consts
export const SAMPLE_INPUT_PROPS: InputProps = {
  textVariant: DEFAULT_TEXT_VARIANT,
  isDisabled: false,
  isStateStylesDisabled: false,
  isReadonly: false,
  placeholder: 'Sample Placeholder',
};
