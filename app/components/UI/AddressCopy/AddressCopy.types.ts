import { IconColor } from '@metamask/design-system-react-native';

export interface AddressCopyProps {
  iconColor?: IconColor;
  hitSlop?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
  /** Optional testID for the outer container */
  testID?: string;
}
