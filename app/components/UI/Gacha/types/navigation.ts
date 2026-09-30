/** Tabs of the Gacha home screen. */
export type GachaHomeTab = 'packs' | 'cards';

export interface GachaHomeParams {
  initialTab?: GachaHomeTab;
}

export interface GachaRevealParams {
  /** Memo of the pack operation to reveal. */
  memo: string;
}

export interface GachaCardParams {
  /** Mint of the card to display. */
  mint: string;
}

// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type GachaStackParamList = {
  GachaHome: GachaHomeParams | undefined;
  GachaReveal: GachaRevealParams;
  GachaCard: GachaCardParams;
};
