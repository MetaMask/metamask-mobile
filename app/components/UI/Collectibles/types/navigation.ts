import { collectiblesRoutes } from '../routeNames';

// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CollectiblesStackParamList = {
  [collectiblesRoutes.home]: undefined;
};
