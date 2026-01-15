import { RouteProp } from '@react-navigation/native';
import {
  StakeScreensParamList,
  UnstakeConfirmationViewRouteParams,
} from '../../types';

export type { UnstakeConfirmationViewRouteParams };

export interface UnstakeConfirmationViewProps {
  route: RouteProp<StakeScreensParamList, 'UnstakeConfirmation'>;
}
