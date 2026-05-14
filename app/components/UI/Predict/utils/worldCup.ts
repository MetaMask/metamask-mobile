import { strings } from '../../../../../locales/i18n';
import type {
  PredictWorldCupConfig,
  PredictWorldCupStageConfig,
} from '../types/flags';

export type PredictWorldCupQueryType = 'all' | 'props' | 'live';

export const PREDICT_WORLD_CUP_QUERY_TYPES = {
  ALL: 'all',
  PROPS: 'props',
  LIVE: 'live',
} as const satisfies Record<string, PredictWorldCupQueryType>;

const WORLD_CUP_BASE_QUERY_PARAMS = {
  active: 'true',
  archived: 'false',
  closed: 'false',
} as const;

const appendBaseWorldCupParams = (params: URLSearchParams): void => {
  Object.entries(WORLD_CUP_BASE_QUERY_PARAMS).forEach(([key, value]) => {
    params.set(key, value);
  });
};

const buildQueryString = (params: URLSearchParams): string => params.toString();

export const buildPredictWorldCupAllQuery = ({
  tagSlug,
}: Pick<PredictWorldCupConfig, 'tagSlug'>): string => {
  const params = new URLSearchParams();
  appendBaseWorldCupParams(params);
  params.set('tag_slug', tagSlug);
  params.set('order', 'volume24hr');
  return buildQueryString(params);
};

export const buildPredictWorldCupPropsQuery = ({
  tagSlug,
  gamesTagId,
}: Pick<PredictWorldCupConfig, 'tagSlug' | 'gamesTagId'>): string => {
  const params = new URLSearchParams();
  appendBaseWorldCupParams(params);
  params.set('tag_slug', tagSlug);
  params.set('exclude_tag_id', gamesTagId);
  params.set('order', 'volume24hr');
  return buildQueryString(params);
};

export const buildPredictWorldCupLiveQuery = ({
  seriesId,
  gamesTagId,
}: Pick<PredictWorldCupConfig, 'seriesId' | 'gamesTagId'>): string => {
  const params = new URLSearchParams();
  appendBaseWorldCupParams(params);
  params.set('series_id', seriesId);
  params.set('tag_id', gamesTagId);
  params.set('live', 'true');
  params.set('order', 'startDate');
  return buildQueryString(params);
};

export const buildPredictWorldCupStageEventsQuery = ({
  eventIds,
}: Pick<PredictWorldCupStageConfig, 'eventIds'>): string => {
  const params = new URLSearchParams();
  appendBaseWorldCupParams(params);
  eventIds.forEach((eventId) => params.append('id', eventId));
  return buildQueryString(params);
};

export const buildPredictWorldCupQuery = (
  type: PredictWorldCupQueryType,
  config: PredictWorldCupConfig,
): string => {
  switch (type) {
    case PREDICT_WORLD_CUP_QUERY_TYPES.ALL:
      return buildPredictWorldCupAllQuery(config);
    case PREDICT_WORLD_CUP_QUERY_TYPES.PROPS:
      return buildPredictWorldCupPropsQuery(config);
    case PREDICT_WORLD_CUP_QUERY_TYPES.LIVE:
      return buildPredictWorldCupLiveQuery(config);
    default:
      return buildPredictWorldCupAllQuery(config);
  }
};

const isMissingTranslation = (value: string, key: string): boolean =>
  value === key || value.startsWith('[missing');

const translateIfPresent = (key: string): string | undefined => {
  const value = strings(key);
  return isMissingTranslation(value, key) ? undefined : value;
};

export const getPredictWorldCupStageDerivedLabelKey = (
  stageKey: string,
): string => `predict.world_cup.stages.${stageKey}`;

export const resolvePredictWorldCupStageLabel = ({
  key,
  labelKey,
  label,
}: Pick<PredictWorldCupStageConfig, 'key' | 'labelKey' | 'label'>): string => {
  if (labelKey) {
    const translatedLabel = translateIfPresent(labelKey);
    if (translatedLabel) {
      return translatedLabel;
    }
  }

  if (label) {
    return label;
  }

  const derivedLabelKey = getPredictWorldCupStageDerivedLabelKey(key);
  return translateIfPresent(derivedLabelKey) ?? key;
};
