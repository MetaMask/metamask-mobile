import { RouteProp } from '@react-navigation/native';

interface GasImpactModalRouteParams {
  amountWei: string;
  amountFiat: string;
  annualRewardsETH: string;
  annualRewardsFiat: string;
  annualRewardRate: string;
  estimatedGasFee: string;
  estimatedGasFeePercentage: string;
}

export interface GasImpactModalProps {
  route: RouteProp<{ params: GasImpactModalRouteParams }, 'params'>;
}
