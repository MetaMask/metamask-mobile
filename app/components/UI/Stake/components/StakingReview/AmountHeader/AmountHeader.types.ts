import { ViewProps } from 'react-native';

export interface AmountHeaderProps extends Pick<ViewProps, 'style'> {
  balanceEth: string;
  balanceFiat: string;
}
