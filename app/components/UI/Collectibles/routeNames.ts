import type { NavigatorScreenParams } from '@react-navigation/native';

export const collectiblesRoutes = {
  root: 'Collectibles',
  home: 'CollectiblesHome',
  buySheet: 'CollectiblesBuySheet',
} as const;

export const collectiblesTabs = [
  'popular',
  'packs',
  'collection',
  'marketplace',
] as const;

export type CollectiblesTab = (typeof collectiblesTabs)[number];

export interface CollectiblesHomeParams {
  tab?: CollectiblesTab;
}

export type CollectiblesStackParamList = Record<
  typeof collectiblesRoutes.home,
  CollectiblesHomeParams | undefined
>;

export interface BuySheetParams {
  packCode: string;
}

export type CollectiblesParamList = ReactNavigation.RootParamList &
  Record<
    typeof collectiblesRoutes.root,
    NavigatorScreenParams<CollectiblesStackParamList> | undefined
  > &
  Record<typeof collectiblesRoutes.buySheet, BuySheetParams>;
