// Third party dependencies.
import { ImageSourcePropType, TouchableOpacityProps } from 'react-native';

/**
 * PickerNetwork component props.
 */
export interface PickerNetworkProps extends TouchableOpacityProps {
  /**
   * Optional Network image from either a local or remote source.
   */
  imageSource: ImageSourcePropType;
  /**
   * Network label to display.
   */
  label: string;
  /**
   * Callback to trigger when picker is pressed.
   */
  onPress: () => void;
}

export type PickerNetworkStyleSheetVars = Pick<PickerNetworkProps, 'style'>;
