import { RouteProp } from '@react-navigation/native';

export interface UnstakeConfirmationViewRouteParams {
  amountWei: string;
  amountFiat: string;
}

export interface UnstakeConfirmationViewProps {
  route: RouteProp<{ params: UnstakeConfirmationViewRouteParams }, 'params'>;
}
