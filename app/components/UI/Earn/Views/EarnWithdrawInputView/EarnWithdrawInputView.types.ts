import { RouteProp } from '@react-navigation/native';
import { TokenI } from '../../../Tokens/types';

interface EarnWithdrawInputViewRouteParams {
  token: TokenI;
}

export interface EarnWithdrawInputViewProps {
  route: RouteProp<{ params: EarnWithdrawInputViewRouteParams }, 'params'>;
}
