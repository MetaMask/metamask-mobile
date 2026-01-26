/**
 * StickyBottomBar component types
 */

import { StyleProp, ViewStyle } from 'react-native';
import { ButtonPrimaryProps } from '../../components/Buttons/Button/variants/ButtonPrimary/ButtonPrimary.types';

export interface StickyBottomBarProps {
  /**
   * Array of button configurations (left to right)
   * Maximum 4 buttons recommended for mobile
   * Note: All buttons use ButtonVariants.Primary styling
   */
  buttons: ButtonPrimaryProps[];

  /**
   * Optional custom styles for the container
   */
  style?: StyleProp<ViewStyle>;

  /**
   * Optional test ID
   */
  testID?: string;
}
