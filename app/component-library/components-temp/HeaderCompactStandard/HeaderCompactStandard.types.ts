// External dependencies.
import {
  ButtonIconProps,
  TextProps,
} from '@metamask/design-system-react-native';

// Internal dependencies.
import { HeaderBaseProps } from '../../components/HeaderBase';

/**
 * HeaderCompactStandard component props.
 */
export interface HeaderCompactStandardProps extends HeaderBaseProps {
  /**
   * Title text to display in the header.
   * Used as children if children prop is not provided.
   * Rendered with TextVariant.BodyMd and FontWeight.Bold by default.
   */
  title?: string;
  /**
   * Additional props to pass to the title Text component.
   * Props are spread to the Text component and can override default values.
   */
  titleProps?: Partial<TextProps>;
  /**
   * Subtitle text to display below the title.
   * Rendered with TextVariant.BodySm and TextColor.TextAlternative by default.
   */
  subtitle?: string;
  /**
   * Additional props to pass to the subtitle Text component.
   * Props are spread to the Text component and can override default values.
   */
  subtitleProps?: Partial<TextProps>;
  /**
   * Callback when the back button is pressed.
   * If provided, a back button will be rendered as startButtonIconProps.
   */
  onBack?: () => void;
  /**
   * Additional props to pass to the back ButtonIcon.
   * If provided, a back button will be rendered as startButtonIconProps with these props spread.
   */
  backButtonProps?: Omit<ButtonIconProps, 'iconName'>;
  /**
   * Callback when the close button is pressed.
   * If provided, a close button will be added to endButtonIconProps.
   */
  onClose?: () => void;
  /**
   * Additional props to pass to the close ButtonIcon.
   * If provided, a close button will be added to endButtonIconProps with these props spread.
   */
  closeButtonProps?: Omit<ButtonIconProps, 'iconName'>;
}
