import { ViewStyle } from 'react-native';

export interface SmartTransactionsEnabledBannerProps {
  style?: ViewStyle;
  onClose?: () => void;
}

export type SmartTransactionsEnabledBannerStyleSheetVars = Pick<
  SmartTransactionsEnabledBannerProps,
  'style'
>;
