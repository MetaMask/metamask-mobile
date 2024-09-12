import {
  NavigationProp,
  ParamListBase,
  RouteProp,
} from '@react-navigation/native';

export interface Props {
  /**
	/* navigation object required to push new views
	*/
  navigation: NavigationProp<ParamListBase>;
  /**
   * contains params that are passed in from navigation
   */
  route: RouteProp<{ params: { isFullScreenModal?: boolean } }, 'params'>;
}
