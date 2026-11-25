import type { NavigatorScreenParams } from '@react-navigation/native';

export const collectiblesRoutes = {
  root: 'Collectibles',
  tabs: 'CollectiblesTabs',
} as const;

export const collectiblesTabs = [
  'popular',
  'packs',
  'collection',
  'marketplace',
] as const;

export type CollectiblesTab = (typeof collectiblesTabs)[number];

export interface CollectiblesTabsParams {
  tab?: CollectiblesTab;
}

export type CollectiblesStackParamList = Record<
  typeof collectiblesRoutes.tabs,
  CollectiblesTabsParams | undefined
>;

export type CollectiblesParamList = ReactNavigation.RootParamList &
  Record<
    typeof collectiblesRoutes.root,
    NavigatorScreenParams<CollectiblesStackParamList> | undefined
  >;
