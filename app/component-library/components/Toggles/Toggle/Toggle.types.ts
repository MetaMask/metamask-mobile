// Third party dependencies.
import { SwitchProps } from 'react-native';

/**
 * Toggle component props.
 */
export interface ToggleProps extends SwitchProps {
  /**
   * Determines if toggle is selected.
   * @default false
   */
  isSelected?: boolean;
}
