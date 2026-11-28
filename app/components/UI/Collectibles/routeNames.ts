import type { NavigatorScreenParams } from '@react-navigation/native';

export const collectiblesRoutes = {
  root: 'Collectibles',
  home: 'CollectiblesHome',
  buySheet: 'CollectiblesBuySheet',
  packDetail: 'CollectiblesPackDetail',
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

export interface PackDetailParams {
  packCode: string;
}

export type CollectiblesStackParamList = Record<
  typeof collectiblesRoutes.home,
  CollectiblesHomeParams | undefined
> &
  Record<typeof collectiblesRoutes.packDetail, PackDetailParams>;

export interface BuySheetParams {
  packCode: string;
  name: string;
  priceUsd: number;
}

export type CollectiblesParamList = ReactNavigation.RootParamList &
  Record<
    typeof collectiblesRoutes.root,
    NavigatorScreenParams<CollectiblesStackParamList> | undefined
  > &
  Record<typeof collectiblesRoutes.buySheet, BuySheetParams>;
