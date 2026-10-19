import { RouteProp } from '@react-navigation/native';

export interface StakingConfirmationRouteParams {
  amountWei: string;
  amountFiat: string;
}

export interface StakingConfirmationProps {
  route: RouteProp<{ params: StakingConfirmationRouteParams }, 'params'>;
}
