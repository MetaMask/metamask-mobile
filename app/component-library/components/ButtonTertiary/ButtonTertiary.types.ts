import { ViewStyle } from 'react-native';
import { BaseButtonProps } from '../BaseButton';

/**
 * ButtonTertiary component props.
 */
export type ButtonTertiaryProps = Omit<BaseButtonProps, 'labelColor'>;

/**
 * ButtonTertiary component style sheet.
 */
export interface ButtonTertiaryStyleSheet {
  base: ViewStyle;
}

/**
 * Style sheet input parameters.
 */
export type ButtonTertiaryStyleSheetVars = Pick<ButtonTertiaryProps, 'style'>;
