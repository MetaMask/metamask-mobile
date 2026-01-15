import { RouteProp } from '@react-navigation/native';
import {
  StakeScreensParamList,
  StakeConfirmationViewRouteParams,
} from '../../types';

export type { StakeConfirmationViewRouteParams };

export interface StakeConfirmationViewProps {
  route: RouteProp<StakeScreensParamList, 'StakeConfirmation'>;
}
