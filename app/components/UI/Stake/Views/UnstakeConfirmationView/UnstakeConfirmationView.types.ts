import { RouteProp } from '@react-navigation/native';

interface UnstakeConfirmationViewRouteParams {
  amountWei: string;
  amountFiat: string;
  chainId: string;
}

export interface UnstakeConfirmationViewProps {
  route: RouteProp<{ params: UnstakeConfirmationViewRouteParams }, 'params'>;
}
