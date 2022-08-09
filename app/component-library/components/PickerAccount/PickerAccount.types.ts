import { StyleProp, TouchableOpacityProps, ViewStyle } from 'react-native';
import { AccountAvatarType } from '../AccountAvatar';

/**
 * PickerAccount component props.
 */
export interface PickerAccountProps extends TouchableOpacityProps {
  /**
   * Callback to trigger when pressed.
   */
  onPress: () => void;
  /**
   * An Ethereum wallet address.
   */
  accountAddress: string;
  /**
   * AccountAvatar variants.
   */
  accountAvatarType: AccountAvatarType;
  /**
   * Name of the account.
   */
  accountName: string;
  /**
   * Escape hatch for applying extra styles. Only use if absolutely necessary.
   */
  style?: StyleProp<ViewStyle>;
}

/**
 * Style sheet input parameters.
 */
export type PickerAccountStyleSheetVars = Pick<PickerAccountProps, 'style'>;
