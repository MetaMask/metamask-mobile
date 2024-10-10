import { ViewProps } from 'react-native';

export interface AmountHeaderProps extends Pick<ViewProps, 'style'> {
  amountWei: string;
  amountFiat: string;
  tokenSymbol: string;
}
