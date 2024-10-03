import { RouteProp } from '@react-navigation/native';

interface StakeConfirmationViewRouteParams {
  wei: string;
  fiat: string;
}

export interface StakeConfirmationViewProps {
  route: RouteProp<{ params: StakeConfirmationViewRouteParams }, 'params'>;
}
