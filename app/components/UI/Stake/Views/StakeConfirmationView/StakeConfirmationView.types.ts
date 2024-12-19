import { RouteProp } from '@react-navigation/native';

interface StakeConfirmationViewRouteParams {
  amountWei: string;
  amountFiat: string;
  annualRewardsETH: string;
  annualRewardsFiat: string;
  annualRewardRate: string;
}

export interface StakeConfirmationViewProps {
  route: RouteProp<{ params: StakeConfirmationViewRouteParams }, 'params'>;
}
