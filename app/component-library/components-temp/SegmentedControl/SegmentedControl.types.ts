// Third party dependencies.
import { ViewProps } from 'react-native';

// External dependencies.
import { ButtonSize } from '../../components/Buttons/Button/Button.types';
import { IconName } from '../../components/Icons/Icon';
import { TextVariant } from '../../components/Texts/Text';

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
  /**
   * Optional icon to display before the label
   */
  startIconName?: IconName;
  /**
   * Optional icon to display after the label
   */
  endIconName?: IconName;
  /**
   * Optional text variant for the label
   */
  labelTextVariant?: TextVariant;
  /**
   * Optional test ID for the option
   */
  testID?: string;
  /**
   * Optional accessibility label for the option
   */
  accessibilityLabel?: string;
}

/**
 * Base props for the SegmentedControl component.
 */
export interface BaseSegmentedControlProps extends ViewProps {
  /**
   * Array of options to display in the segmented control
   */
  options: SegmentedControlOption[];

  /**
   * Size of the control and its buttons
   * @default ButtonSize.Md
   */
  size?: ButtonSize;

  /**
   * Whether buttons should size to their content instead of having equal widths.
   * When true (default), buttons will size based on their content.
   * When false, all buttons have equal widths filling the container.
   * @default true
   */
  isButtonWidthFlexible?: boolean;

  /**
   * Whether the control is disabled
   * @default false
   */
  isDisabled?: boolean;

  /**
   * Whether the control should be horizontally scrollable.
   * Useful when there are many options that may not fit on the screen.
   * @default false
   */
  isScrollable?: boolean;
}

/**
 * Props for single-select mode.
 */
export interface SingleSelectSegmentedControlProps
  extends BaseSegmentedControlProps {
  /**
   * Whether the control allows multiple selections
   * @default false
   */
  isMultiSelect?: false;

  /**
   * Value of the currently selected option
   */
  selectedValue?: string;

  /**
   * Callback when an option is selected
   */
  onValueChange?: (value: string) => void;
}

/**
 * Props for multi-select mode.
 */
export interface MultiSelectSegmentedControlProps
  extends BaseSegmentedControlProps {
  /**
   * Whether the control allows multiple selections
   */
  isMultiSelect: true;

  /**
   * Values of the currently selected options
   */
  selectedValues?: string[];

  /**
   * Callback when selected options change
   */
  onValueChange?: (values: string[]) => void;
}

/**
 * Union type for all possible SegmentedControl props
 */
export type SegmentedControlProps =
  | SingleSelectSegmentedControlProps
  | MultiSelectSegmentedControlProps;

/**
 * Style sheet input parameters.
 */
export interface SegmentedControlStyleSheetVars {
  style?: ViewProps['style'];
  size?: ButtonSize;
  isButtonWidthFlexible?: boolean;
}
