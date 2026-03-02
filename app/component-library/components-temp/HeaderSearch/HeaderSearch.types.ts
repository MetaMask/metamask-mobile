// External dependencies.
import {
  BoxProps,
  ButtonIconProps,
  ButtonProps,
} from '@metamask/design-system-react-native';

// Internal dependencies.
import { TextFieldSearchProps } from '../../components/Form/TextFieldSearch/TextFieldSearch.types';

/**
 * Variant enum for HeaderSearch component.
 */
export enum HeaderSearchVariant {
  Screen = 'screen',
  Inline = 'inline',
}

/**
 * Base props shared by both variants - extends BoxProps.
 */
interface HeaderSearchBaseProps extends Omit<BoxProps, 'children'> {
  /**
   * Props to pass to the TextFieldSearch component.
   */
  textFieldSearchProps: Omit<TextFieldSearchProps, 'style'>;
}

/**
 * Screen variant props.
 * Renders a back button (ArrowLeft) on the left side.
 */
export interface HeaderSearchScreenProps extends HeaderSearchBaseProps {
  /**
   * The variant of the component.
   */
  variant: HeaderSearchVariant.Screen;
  /**
   * Callback when the back button is pressed.
   */
  onPressBackButton: () => void;
  /**
   * Optional props to pass to the back ButtonIcon.
   */
  backButtonProps?: Omit<ButtonIconProps, 'iconName' | 'onPress'>;
}

/**
 * Inline variant props.
 * Renders a cancel button on the right side.
 */
export interface HeaderSearchInlineProps extends HeaderSearchBaseProps {
  /**
   * The variant of the component.
   */
  variant: HeaderSearchVariant.Inline;
  /**
   * Callback when the cancel button is pressed.
   */
  onPressCancelButton: () => void;
  /**
   * Optional props to pass to the cancel Button.
   */
  cancelButtonProps?: Omit<ButtonProps, 'variant' | 'onPress' | 'children'>;
}

/**
 * HeaderSearch component props.
 */
export type HeaderSearchProps =
  | HeaderSearchScreenProps
  | HeaderSearchInlineProps;
