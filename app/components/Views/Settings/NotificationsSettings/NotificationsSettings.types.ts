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
  route: RouteProp<
    {
      params: {
        isFullScreenModal?: boolean;
        /**
         * Deeplink `section` query value. When set to a known slug (e.g.
         * `wallet-activity`, `price-alerts`), the screen opens that preference
         * section. Unknown values are ignored.
         */
        section?: string;
      };
    },
    'params'
  >;
}
