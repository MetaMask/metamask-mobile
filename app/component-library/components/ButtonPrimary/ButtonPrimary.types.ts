import { ViewStyle } from 'react-native';
import { BaseButtonProps } from '../BaseButton';

/**
 * ButtonPrimary component props.
 */
export type ButtonPrimaryProps = Omit<BaseButtonProps, 'labelColor'>;

/**
 * ButtonPrimary component style sheet.
 */
export interface ButtonPrimaryStyleSheet {
  base: ViewStyle;
}

/**
 * Style sheet input parameters.
 */
export type ButtonPrimaryStyleSheetVars = Pick<ButtonPrimaryProps, 'style'>;
