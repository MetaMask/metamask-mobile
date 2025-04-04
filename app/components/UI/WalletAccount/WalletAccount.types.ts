import { ViewStyle } from 'react-native';

export interface WalletAccountProps {
  style?: ViewStyle;
}

/**
 * Style sheet input parameters.
 */
export type WalletAccountStyleSheetVars = Pick<WalletAccountProps, 'style'>;
