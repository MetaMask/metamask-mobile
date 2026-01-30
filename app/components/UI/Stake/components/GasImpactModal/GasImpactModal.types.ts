import { RouteProp } from '@react-navigation/native';

export interface GasImpactModalRouteParams {
  amountWei: string;
  amountFiat: string;
  annualRewardsETH: string;
  annualRewardsFiat: string;
  annualRewardRate: string;
  estimatedGasFee: string;
  estimatedGasFeePercentage: string;
  chainId: string;
}

export interface GasImpactModalProps {
  route: RouteProp<{ params: GasImpactModalRouteParams }, 'params'>;
}
