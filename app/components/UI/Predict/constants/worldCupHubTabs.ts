import { strings } from '../../../../../locales/i18n';

export const PREDICT_WORLD_CUP_HUB_TAB_KEYS = {
  GAMES: 'games',
  PROPS: 'props',
} as const;

export type PredictWorldCupHubTabKey =
  (typeof PREDICT_WORLD_CUP_HUB_TAB_KEYS)[keyof typeof PREDICT_WORLD_CUP_HUB_TAB_KEYS];

export interface PredictWorldCupHubTab {
  key: PredictWorldCupHubTabKey;
  label: string;
  hasLiveDot?: boolean;
}

export const PREDICT_WORLD_CUP_HUB_DEFAULT_TAB =
  PREDICT_WORLD_CUP_HUB_TAB_KEYS.GAMES;

export const buildPredictWorldCupHubTabs = (
  isLive: boolean,
): PredictWorldCupHubTab[] => [
  {
    key: PREDICT_WORLD_CUP_HUB_TAB_KEYS.GAMES,
    label: strings('predict.world_cup.tabs.games'),
    hasLiveDot: isLive,
  },
  {
    key: PREDICT_WORLD_CUP_HUB_TAB_KEYS.PROPS,
    label: strings('predict.world_cup.tabs.props'),
  },
];

/**
 * Maps an incoming `initialTab` route param (used by the legacy V1 World Cup
 * screen) to a V2 hub tab. Only an explicit `props` request opens the Props
 * tab; anything else (including undefined) falls back to the default Games tab.
 */
export const resolvePredictWorldCupHubInitialTab = (
  requestedTab?: string | null,
): PredictWorldCupHubTabKey =>
  requestedTab?.trim().toLowerCase() === PREDICT_WORLD_CUP_HUB_TAB_KEYS.PROPS
    ? PREDICT_WORLD_CUP_HUB_TAB_KEYS.PROPS
    : PREDICT_WORLD_CUP_HUB_DEFAULT_TAB;
