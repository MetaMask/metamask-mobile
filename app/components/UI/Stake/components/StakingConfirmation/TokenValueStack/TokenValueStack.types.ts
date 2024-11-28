import { ViewProps } from 'react-native';

export interface TokenValueStackProps extends Pick<ViewProps, 'style'> {
  amountWei: string;
  amountFiat: string;
  tokenSymbol: string;
}
