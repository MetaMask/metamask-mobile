export const collectiblesRoutes = {
  root: 'Collectibles',
} as const;

export const collectiblesTabs = [
  'popular',
  'packs',
  'collection',
  'marketplace',
] as const;

export type CollectiblesTab = (typeof collectiblesTabs)[number];

export interface CollectiblesParams {
  tab?: CollectiblesTab;
}

export type CollectiblesParamList = ReactNavigation.RootParamList &
  Record<typeof collectiblesRoutes.root, CollectiblesParams | undefined>;
