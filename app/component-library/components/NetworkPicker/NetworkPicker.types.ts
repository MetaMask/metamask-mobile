import { TouchableOpacityProps } from 'react-native';

/**
 * NetworkPicker component props.
 */
export interface NetworkPickerProps extends TouchableOpacityProps {
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

export type NetworkPickerStyleSheetVars = Pick<NetworkPickerProps, 'style'>;
