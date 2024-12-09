import { RouteProp } from '@react-navigation/native';
import { TokenI } from '../../../Tokens/types';

interface StakeEarningsHistoryViewRouteParams {
    asset: TokenI
}

export interface StakeEarningsHistoryViewProps {
  route: RouteProp<{ params: StakeEarningsHistoryViewRouteParams }, 'params'>;
}
