/** Tabs of the Gacha home screen. */
export type GachaHomeTab = 'packs' | 'cards';

export interface GachaHomeParams {
  initialTab?: GachaHomeTab;
}

// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type GachaStackParamList = {
  GachaHome: GachaHomeParams | undefined;
};
