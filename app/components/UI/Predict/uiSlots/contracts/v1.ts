import type { PartialUiSlotsContractRegistry } from '../../../../../core/Engine/controllers/ui-slots-controller/contracts/registry';
import type {
  PredictDiscoveryListWidget,
  PredictHomepageMarketSlotReference,
  PredictHomepageMarketSlotReferenceItem,
} from '../types';
import { isPredictHomepageSeriesId } from '../seriesRegistry';

const MAX_PREDICT_HOMEPAGE_MARKET_SLOTS = 10;
const MAX_PREDICT_HOMEPAGE_EVENT_IDENTIFIER_LENGTH = 512;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasExactKeys = (
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
): boolean => {
  const keys = Object.keys(value);
  return (
    keys.length === expectedKeys.length &&
    keys.every((key) => expectedKeys.includes(key))
  );
};

const isNonBlankString = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.trim().length > 0 &&
  value.length <= MAX_PREDICT_HOMEPAGE_EVENT_IDENTIFIER_LENGTH;

const parsePredictDiscoveryListWidget = (
  value: unknown,
): PredictDiscoveryListWidget => {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ['type', 'schemaVersion', 'props']) ||
    value.type !== 'predict-discovery-list' ||
    value.schemaVersion !== 1 ||
    !isRecord(value.props) ||
    !hasExactKeys(value.props, [])
  ) {
    throw new Error('Invalid Predict discovery list widget.');
  }

  return {
    type: 'predict-discovery-list',
    schemaVersion: 1,
    props: {},
  };
};

const parsePredictHomepageMarketSlotItem = (
  value: unknown,
): PredictHomepageMarketSlotReferenceItem => {
  if (!isRecord(value) || typeof value.type !== 'string') {
    throw new Error('Invalid Predict homepage market slot item.');
  }
  if (value.type === 'event') {
    if (
      !hasExactKeys(value, ['type', 'id', 'slug']) ||
      !isNonBlankString(value.id) ||
      !isNonBlankString(value.slug)
    ) {
      throw new Error('Invalid Predict homepage event slot.');
    }
    return { type: 'event', id: value.id, slug: value.slug };
  }
  if (value.type === 'series') {
    if (
      !hasExactKeys(value, ['type', 'seriesId']) ||
      !isPredictHomepageSeriesId(value.seriesId)
    ) {
      throw new Error('Invalid Predict homepage series slot.');
    }
    return { type: 'series', seriesId: value.seriesId };
  }
  throw new Error('Unknown Predict homepage market slot item type.');
};

const parsePredictHomepageMarketSlotReference = (
  value: unknown,
): PredictHomepageMarketSlotReference => {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ['id', 'type', 'params']) ||
    value.id !== 'markets' ||
    value.type !== 'predict-homepage-market-slots' ||
    !isRecord(value.params) ||
    !hasExactKeys(value.params, ['venue', 'items']) ||
    value.params.venue !== 'polymarket' ||
    !Array.isArray(value.params.items) ||
    value.params.items.length === 0 ||
    value.params.items.length > MAX_PREDICT_HOMEPAGE_MARKET_SLOTS
  ) {
    throw new Error('Invalid Predict homepage market slots reference.');
  }

  const items = value.params.items.map(parsePredictHomepageMarketSlotItem);
  const eventIds = new Set<string>();
  const eventSlugs = new Set<string>();
  const seriesIds = new Set<string>();
  for (const item of items) {
    if (item.type === 'event') {
      if (eventIds.has(item.id) || eventSlugs.has(item.slug)) {
        throw new Error('Duplicate Predict homepage event slot.');
      }
      eventIds.add(item.id);
      eventSlugs.add(item.slug);
    } else {
      if (seriesIds.has(item.seriesId)) {
        throw new Error('Duplicate Predict homepage series slot.');
      }
      seriesIds.add(item.seriesId);
    }
  }

  return {
    id: 'markets',
    type: 'predict-homepage-market-slots',
    params: {
      venue: 'polymarket',
      items,
    },
  };
};

export const PREDICT_UI_SLOTS_V1_CONTRACTS: PartialUiSlotsContractRegistry = {
  widgets: {
    'predict-discovery-list': parsePredictDiscoveryListWidget,
  },
  dataReferences: {
    'predict-homepage-market-slots': parsePredictHomepageMarketSlotReference,
  },
};
