// Third party dependencies.
import { ImageSourcePropType } from 'react-native';
import { TouchableOpacityProps } from '../../../../components/Base/TouchableOpacity';

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
   * Optional Boolean to determine if the picker is pressable. Defaults to `false`.
   */
  isDisabled?: boolean;
  /**
   * Callback to trigger when picker is pressed.
   */
  onPress?: () => void;
  /**
   * Whether to hide the network name.
   */
  hideNetworkName?: boolean;
}

export type PickerNetworkStyleSheetVars = Pick<PickerNetworkProps, 'style'>;
