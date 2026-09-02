import type { UiSlotDataReference } from '../../../../core/Engine/controllers/ui-slots-controller/types';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PredictDiscoveryListWidget = {
  type: 'predict-discovery-list';
  schemaVersion: 1;
  props: Record<string, never>;
};

export type PredictHomepageMarketSlotReferenceItem =
  | { type: 'event'; id: string; slug: string }
  | { type: 'series'; seriesId: 'btc-up-or-down-5m' };

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PredictHomepageMarketSlotReference = {
  id: 'markets';
  type: 'predict-homepage-market-slots';
  params: {
    venue: 'polymarket';
    items: PredictHomepageMarketSlotReferenceItem[];
  };
};

declare module '../../../../core/Engine/controllers/ui-slots-controller/types' {
  interface UiSlotsScreenIdMap {
    'wallet-home': 'wallet-home';
  }

  interface UiSlotWidgetMap {
    'predict-discovery-list': PredictDiscoveryListWidget;
  }

  interface UiSlotDataReferenceMap {
    'predict-homepage-market-slots': PredictHomepageMarketSlotReference;
  }
}

export const isPredictHomepageMarketSlotReference = (
  reference: UiSlotDataReference,
): reference is PredictHomepageMarketSlotReference =>
  reference.type === 'predict-homepage-market-slots';
