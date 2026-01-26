import { RouteProp } from '@react-navigation/native';

export interface StakeConfirmationViewRouteParams {
  amountWei: string;
  amountFiat: string;
  annualRewardsETH: string;
  annualRewardsFiat: string;
  annualRewardRate: string;
  chainId: string;
}

export interface StakeConfirmationViewProps {
  route: RouteProp<{ params: StakeConfirmationViewRouteParams }, 'params'>;
}
