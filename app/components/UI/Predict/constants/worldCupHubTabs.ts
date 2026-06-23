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
