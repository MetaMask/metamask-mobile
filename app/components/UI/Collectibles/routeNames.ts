import type { NavigatorScreenParams } from '@react-navigation/native';

export const collectiblesRoutes = {
  root: 'Collectibles',
  home: 'CollectiblesHome',
  packs: 'CollectiblesPacks',
  collection: 'CollectiblesCollection',
  market: 'CollectiblesMarket',
} as const;

export type CollectiblesStackParamList = Record<
  | typeof collectiblesRoutes.home
  | typeof collectiblesRoutes.packs
  | typeof collectiblesRoutes.collection
  | typeof collectiblesRoutes.market,
  undefined
>;

export type CollectiblesParamList = ReactNavigation.RootParamList &
  Record<
    typeof collectiblesRoutes.root,
    NavigatorScreenParams<CollectiblesStackParamList> | undefined
  >;
