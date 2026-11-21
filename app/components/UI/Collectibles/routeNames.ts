export const collectiblesRoutes = {
  buySheet: 'CollectiblesBuySheet',
} as const;

export interface BuySheetParams {
  packCode: string;
}

export type CollectiblesParamList = ReactNavigation.RootParamList &
  Record<typeof collectiblesRoutes.buySheet, BuySheetParams>;
