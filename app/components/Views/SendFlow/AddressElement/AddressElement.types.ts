import { TouchableOpacityProps } from 'react-native';

export interface AddressElementProps extends TouchableOpacityProps {
  /**
   * Name to display
   */
  name?: string;
  /**
   * Ethereum address
   */
  address: string;
  /**
   * Callback on account press
   */
  onAccountPress: (address: string) => void;
  /**
   * Callback on account long press
   */
  onAccountLongPress: (address: string) => void;
}
