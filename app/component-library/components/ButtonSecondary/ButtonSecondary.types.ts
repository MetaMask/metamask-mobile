import { ViewStyle } from 'react-native';
import { BaseButtonProps } from '../BaseButton';

/**
 * ButtonSecondary component props.
 */
export type ButtonSecondaryProps = Omit<BaseButtonProps, 'labelColor'>;

/**
 * ButtonSecondary component style sheet.
 */
export interface ButtonSecondaryStyleSheet {
  base: ViewStyle;
}

/**
 * Style sheet input parameters.
 */
export type ButtonSecondaryStyleSheetVars = Pick<ButtonSecondaryProps, 'style'>;
