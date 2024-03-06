import { ViewStyle } from 'react-native';
import { Account } from '../../hooks/useAccounts';

export interface WalletAccountProps {
  style?: ViewStyle;
  account: Account;
  ens?: string;
}

/**
 * Style sheet input parameters.
 */
export type WalletAccountStyleSheetVars = Pick<WalletAccountProps, 'style'>;
