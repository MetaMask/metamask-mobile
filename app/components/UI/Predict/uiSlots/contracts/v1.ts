import {
  array,
  assert,
  define,
  literal,
  object,
  size,
  union,
} from '@metamask/superstruct';
import type { UiSlotsContractRegistry } from '../../../../../core/Engine/controllers/ui-slots-controller/contracts/registry';
import type {
  PredictDiscoveryListWidget,
  PredictHomepageMarketSlotReference,
} from '../types';
import {
  isPredictHomepageSeriesId,
  type PredictHomepageSeriesId,
} from '../seriesRegistry';

const MAX_PREDICT_HOMEPAGE_MARKET_SLOTS = 10;
const MAX_PREDICT_HOMEPAGE_EVENT_IDENTIFIER_LENGTH = 512;

const eventIdentifier = define<string>(
  'non-blank Predict event identifier',
  (value) =>
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= MAX_PREDICT_HOMEPAGE_EVENT_IDENTIFIER_LENGTH,
);
const seriesId = define<PredictHomepageSeriesId>(
  'supported Predict homepage series',
  isPredictHomepageSeriesId,
);
const discoveryListWidget = object({
  type: literal('predict-discovery-list'),
  schemaVersion: literal(1),
  props: object({}),
});
const marketSlotsReference = object({
  id: literal('markets'),
  type: literal('predict-homepage-market-slots'),
  params: object({
    venue: literal('polymarket'),
    items: size(
      array(
        union([
          object({
            type: literal('event'),
            id: eventIdentifier,
            slug: eventIdentifier,
          }),
          object({ type: literal('series'), seriesId }),
        ]),
      ),
      1,
      MAX_PREDICT_HOMEPAGE_MARKET_SLOTS,
    ),
  }),
});

const parsePredictDiscoveryListWidget = (
  value: unknown,
): PredictDiscoveryListWidget => {
  assert(value, discoveryListWidget);
  return value;
};

const parsePredictHomepageMarketSlotReference = (
  value: unknown,
): PredictHomepageMarketSlotReference => {
  assert(value, marketSlotsReference);
  const eventIds = new Set<string>();
  const eventSlugs = new Set<string>();
  const seriesIds = new Set<string>();
  for (const item of value.params.items) {
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

  return value;
};

export const PREDICT_UI_SLOTS_V1_CONTRACTS = {
  slots: {
    'wallet-home.predict-empty-state': {
      widgetTypes: ['predict-discovery-list'],
      dataReferenceTypes: ['predict-homepage-market-slots'],
      requiredDataReferenceTypes: ['predict-homepage-market-slots'],
    },
  },
  widgets: {
    'predict-discovery-list': parsePredictDiscoveryListWidget,
  },
  dataReferences: {
    'predict-homepage-market-slots': parsePredictHomepageMarketSlotReference,
  },
} satisfies UiSlotsContractRegistry;
