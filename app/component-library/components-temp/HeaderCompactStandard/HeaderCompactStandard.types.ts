// External dependencies.
import React from 'react';
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
   * Title to display in the header. Can be a string or a React node.
   * Used as children if children prop is not provided.
   * When string: rendered with TextVariant.BodyMd and FontWeight.Bold by default; titleProps apply.
   * When node: rendered as-is; titleProps are not applied.
   */
  title?: string | React.ReactNode;
  /**
   * Additional props to pass to the title Text component.
   * Props are spread to the Text component and can override default values.
   * Only applied when title is a string.
   */
  titleProps?: Partial<TextProps>;
  /**
   * Subtitle to display below the title. Can be a string or a React node.
   * When string: rendered with TextVariant.BodySm and TextColor.TextAlternative by default; subtitleProps apply.
   * When node: rendered inside the same -mt-0.5 container; subtitleProps are not applied.
   */
  subtitle?: string | React.ReactNode;
  /**
   * Additional props to pass to the subtitle Text component.
   * Props are spread to the Text component and can override default values.
   * Only applied when subtitle is a string.
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
