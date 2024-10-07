import { ViewProps } from 'react-native';

export interface AmountHeaderProps extends Pick<ViewProps, 'style'> {
  wei: string;
  fiat: string;
  tokenSymbol: string;
}
