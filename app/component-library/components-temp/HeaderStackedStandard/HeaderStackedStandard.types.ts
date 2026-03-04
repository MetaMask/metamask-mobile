// Third party dependencies.
import { ReactNode } from 'react';

// External dependencies.
import { ButtonIconProps } from '@metamask/design-system-react-native';

// Internal dependencies.
import { HeaderBaseProps } from '../../components/HeaderBase';
import { TitleStandardProps } from '../TitleStandard/TitleStandard.types';

/**
 * HeaderStackedStandard component props.
 */
export interface HeaderStackedStandardProps
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
   * Callback when the close button is pressed.
   * If provided, a close button will be added to endButtonIconProps.
   */
  onClose?: () => void;
  /**
   * Additional props to pass to the close ButtonIcon.
   * If provided, a close button will be added to endButtonIconProps with these props spread.
   */
  closeButtonProps?: Omit<ButtonIconProps, 'iconName'>;
  /**
   * Custom node to render in the title section.
   * If provided, takes priority over titleStandardProps.
   */
  titleStandard?: ReactNode;
  /**
   * Props to pass to the TitleStandard component.
   * Only used if titleStandard is not provided.
   */
  titleStandardProps?: TitleStandardProps;
  /**
   * Test ID for the title section wrapper.
   */
  titleSectionTestID?: string;
}
