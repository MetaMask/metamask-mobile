import { RouteProp } from '@react-navigation/native';
import { StakeModalsParamList, GasImpactModalRouteParams } from '../../types';

export type { GasImpactModalRouteParams };

export interface GasImpactModalProps {
  route: RouteProp<StakeModalsParamList, 'GasImpact'>;
}
