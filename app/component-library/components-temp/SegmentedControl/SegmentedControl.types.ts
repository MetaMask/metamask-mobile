// Third party dependencies.
import { ViewProps } from 'react-native';

// External dependencies.
import { ButtonSize } from '../../components/Buttons/Button/Button.types';

/**
 * Segmented control option type
 */
export interface SegmentedControlOption {
  /**
   * Unique value for the option
   */
  value: string;
  /**
   * Label text to display
   */
  label: string;
}

/**
 * SegmentedControl component props.
 */
export interface SegmentedControlProps extends ViewProps {
  /**
   * Array of options to display in the segmented control
   */
  options: SegmentedControlOption[];

  /**
   * Value of the currently selected option
   */
  selectedValue?: string;

  /**
   * Callback when an option is selected
   */
  onValueChange?: (value: string) => void;

  /**
   * Size of the control and its buttons
   * @default ButtonSize.Md
   */
  size?: ButtonSize;

  /**
   * Whether the control is disabled
   * @default false
   */
  isDisabled?: boolean;
}

/**
 * Style sheet input parameters.
 */
export interface SegmentedControlStyleSheetVars {
  style?: ViewProps['style'];
  size?: ButtonSize;
}
