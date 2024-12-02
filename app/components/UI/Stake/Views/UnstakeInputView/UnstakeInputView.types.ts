import { RouteProp } from '@react-navigation/native';

interface UnstakeInputViewRouteParams {
  stakedBalanceWei: string;
}

export interface UnstakeInputViewProps {
  route: RouteProp<{ params: UnstakeInputViewRouteParams }, 'params'>;
}
