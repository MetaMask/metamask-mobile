import type { NavigatorScreenParams } from '@react-navigation/native';
import type {
  PredictModalsNavigationParamList,
  PredictNavigationParamList,
  PredictStackParamList,
} from '../../Predict/types/navigation';
import type { PredictNextStackParamList } from './types';

/**
 * Screens the `Predict` root route can open: the legacy stack's and the
 * PredictNext stack's. `PredictRoot` mounts one of them for the Active Venue.
 */
// Intersection (`&`) requires `type`; `interface` cannot express this.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PredictRootScreenParamList = PredictStackParamList &
  PredictNextStackParamList;

/**
 * The routes Predict registers on the app's root navigator, owned by
 * PredictNext. `NavigationService` types take Predict's entries from here.
 * The legacy entries go with the legacy stack (PRED-1356).
 */
// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PredictAppRouteParamList = {
  Predict: NavigatorScreenParams<PredictRootScreenParamList> | undefined;
  PredictMarketList: PredictNavigationParamList['PredictMarketList'];
  PredictFeed: PredictNavigationParamList['PredictFeed'];
  PredictMarketDetails: PredictNavigationParamList['PredictMarketDetails'];
  PredictPositions: PredictNavigationParamList['PredictPositions'];
  PredictActivityDetail: PredictModalsNavigationParamList['PredictActivityDetail'];
  PredictModals:
    | NavigatorScreenParams<PredictModalsNavigationParamList>
    | undefined;
  PredictBuyPreview: PredictNavigationParamList['PredictBuyPreview'];
  PredictSellPreview: PredictNavigationParamList['PredictSellPreview'];
  PredictUnavailable: undefined;
  PredictMarketUnavailable: undefined;
  PredictAddFundsSheet: PredictModalsNavigationParamList['PredictAddFundsSheet'];
};
