import { NavigationProp, RouteProp } from '@react-navigation/native';
import { RootParamList } from '../../../../types/navigation';

export interface Props {
  /**
	/* navigation object required to push new views
	*/
  navigation: NavigationProp<RootParamList>;
  /**
   * contains params that are passed in from navigation
   */
  route: RouteProp<{ params: { isFullScreenModal?: boolean } }, 'params'>;
}
