export const collectiblesRoutes = {
  root: 'Collectibles',
  home: 'CollectiblesHome',
} as const;

export type CollectiblesParamList = ReactNavigation.RootParamList &
  Record<typeof collectiblesRoutes.root, undefined>;
