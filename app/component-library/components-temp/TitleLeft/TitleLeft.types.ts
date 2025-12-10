// Third party dependencies.
import { ReactNode } from 'react';

/**
 * TitleLeft component props.
 */
export interface TitleLeftProps {
  /**
   * Main title text, rendered with TextVariant.DisplayMD.
   */
  title?: string;
  /**
   * Optional accessory rendered inline to the right of the title.
   */
  titleAccessory?: ReactNode;
  /**
   * Optional accessory rendered in its own row above the title.
   * If topLabel is provided, topLabel takes priority.
   */
  topAccessory?: ReactNode;
  /**
   * Optional label rendered above the title with TextVariant.BodySMMedium
   * and TextColor.Alternative. Takes priority over topAccessory.
   */
  topLabel?: string;
  /**
   * Optional accessory placed on the far right, vertically centered
   * relative to the title and bottom content.
   */
  endAccessory?: ReactNode;
  /**
   * Optional accessory rendered below the title.
   * If bottomLabel is provided, bottomLabel takes priority.
   */
  bottomAccessory?: ReactNode;
  /**
   * Optional label rendered below the title with TextVariant.BodySMMedium
   * and TextColor.Alternative. Takes priority over bottomAccessory.
   */
  bottomLabel?: string;
  /**
   * Optional test ID for the component.
   */
  testID?: string;
}

