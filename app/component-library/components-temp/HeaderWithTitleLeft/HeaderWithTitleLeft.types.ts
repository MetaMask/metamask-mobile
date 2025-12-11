// Third party dependencies.
import { ReactNode } from 'react';

// External dependencies.
import { ButtonIconProps } from '@metamask/design-system-react-native';

// Internal dependencies.
import { HeaderBaseProps } from '../../components/HeaderBase';
import { TitleLeftProps } from '../TitleLeft/TitleLeft.types';

/**
 * HeaderWithTitleLeft component props.
 */
export interface HeaderWithTitleLeftProps
  extends Omit<HeaderBaseProps, 'children'> {
  /**
   * Callback when the back button is pressed.
   * If provided, a back button will be rendered as startAccessory.
   */
  onBack?: () => void;
  /**
   * Additional props to pass to the back ButtonIcon.
   * If provided, a back button will be rendered with these props spread.
   */
  backButtonProps?: Omit<ButtonIconProps, 'iconName'>;
  /**
   * Custom node to render in the title section.
   * If provided, takes priority over titleLeftProps.
   */
  titleLeft?: ReactNode;
  /**
   * Props to pass to the TitleLeft component.
   * Only used if titleLeft is not provided.
   */
  titleLeftProps?: TitleLeftProps;
}
