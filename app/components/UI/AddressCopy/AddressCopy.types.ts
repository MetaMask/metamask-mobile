import { InternalAccount } from '@metamask/keyring-internal-api';
import { IconColor } from '@metamask/design-system-react-native';

export interface AddressCopyProps {
  account: InternalAccount;
  iconColor?: IconColor;
  hitSlop?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
}
