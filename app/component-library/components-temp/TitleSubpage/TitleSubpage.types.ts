// Third party dependencies.
import { ReactNode } from 'react';

// External dependencies.
import { TextProps } from '@metamask/design-system-react-native';

/**
 * TitleSubpage component props.
 */
export interface TitleSubpageProps {
  /**
   * Main title text, rendered with TextVariant.HeadingMd.
   */
  title?: string;
  /**
   * Optional accessory rendered inline to the right of the title.
   */
  titleAccessory?: ReactNode;
  /**
   * Optional accessory rendered to the left of the title and bottom content.
   * Vertically centered with a gap of 12px from the content.
   */
  startAccessory?: ReactNode;
  /**
   * Optional accessory rendered below the title.
   * If bottomLabel is provided, bottomLabel takes priority.
   */
  bottomAccessory?: ReactNode;
  /**
   * Optional label rendered below the title with TextVariant.BodySm
   * and TextColor.Alternative. Takes priority over bottomAccessory.
   */
  bottomLabel?: string;
  /**
   * Optional props to pass to the title Text component.
   */
  titleProps?: Partial<TextProps>;
  /**
   * Optional props to pass to the bottomLabel Text component.
   */
  bottomLabelProps?: Partial<TextProps>;
  /**
   * Optional test ID for the component.
   */
  testID?: string;
  /**
   * Optional Tailwind class name to apply to the container.
   */
  twClassName?: string;
}
