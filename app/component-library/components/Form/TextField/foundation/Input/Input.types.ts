// Third party dependencies.
import { TextInputProps } from 'react-native';

// External dependencies.
import { TextVariants } from '../../../../Texts/Text';

/**
 * Input component props.
 */
export interface InputProps extends Omit<TextInputProps, 'editable'> {
  /**
   * Optional enum to select between Typography variants.
   * @default sBodyMD
   */
  textVariant?: TextVariants;
  /**
   * Optional boolean to disable Input.
   * @default false
   */
  disabled?: boolean;
  /**
   * Optional boolean to show readonly input.
   * @default false
   */
  readonly?: boolean;
  /**
   * Optional boolean to disable state styles.
   * @default false
   */
  disableStateStyles?: boolean;
}
