/** Tabs of the Gacha home screen. */
export type GachaHomeTab = 'packs' | 'cards' | 'dev';

export interface GachaHomeParams {
  initialTab?: GachaHomeTab;
}

/** Local previews never carry a purchase memo. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type GachaRevealParams =
  | { memo: string; demo?: never }
  | { demo: true; memo?: never };

export interface GachaCardParams {
  /** Mint of the card to display. */
  mint: string;
}

// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type GachaStackParamList = {
  GachaOnboarding: undefined;
  GachaHome: GachaHomeParams | undefined;
  GachaReveal: GachaRevealParams;
  GachaCard: GachaCardParams;
};
