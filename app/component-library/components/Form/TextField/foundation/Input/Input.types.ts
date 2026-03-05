// Third party dependencies.
import { TextInputProps } from 'react-native';

// External dependencies.
import { TextVariant } from '../../../../Texts/Text';

/**
 * Input component props.
 */
export interface InputProps extends Omit<TextInputProps, 'editable'> {
  /**
   * Optional enum to select between Typography variants.
   * @default BodyMD
   */
  textVariant?: TextVariant;
  /**
   * Optional boolean to disable Input.
   * @default false
   */
  isDisabled?: boolean;
  /**
   * Optional boolean to show readonly input.
   * @default false
   */
  isReadonly?: boolean;
  /**
   * Optional boolean to disable state styles.
   * @default false
   */
  isStateStylesDisabled?: boolean;
  /**
   * The value of the text input. Defaults to empty string when not provided,
   * ensuring the iOS placeholder alignment workaround (lineHeight: 0) can
   * safely determine whether the placeholder is visible without internal state.
   */
  value?: string;
}

/**
 * Style sheet input parameters.
 * Placeholder visibility (for lineHeight) is derived in the style sheet from value + placeholder.
 */
export type InputStyleSheetVars = Pick<
  InputProps,
  'style' | 'isStateStylesDisabled' | 'isDisabled' | 'value' | 'placeholder'
> & {
  isFocused: boolean;
  textVariant: TextVariant;
};
