import { TouchableOpacityProps } from 'react-native';

/**
 * PickerNetwork component props.
 */
export interface PickerNetworkProps extends TouchableOpacityProps {
  /**
   * Network image url.
   */
  networkImageUrl: string;
  /**
   * Network label to display.
   */
  networkLabel: string;
  /**
   * Callback to trigger when picker is pressed.
   */
  onPress: () => void;
}

export type PickerNetworkStyleSheetVars = Pick<PickerNetworkProps, 'style'>;
