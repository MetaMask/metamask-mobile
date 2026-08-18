import type { UiSlotDataReference } from '../../../../core/Engine/controllers/ui-slots-controller/types';
import type { PredictFeedReference } from '../types/references';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PredictMarketCarouselWidget = {
  type: 'market-carousel';
  schemaVersion: 1;
  props: {
    title?: string;
  };
};

declare module '../../../../core/Engine/controllers/ui-slots-controller/types' {
  interface UiSlotsScreenIdMap {
    'predict-home': 'predict-home';
  }

  interface UiSlotWidgetMap {
    'market-carousel': PredictMarketCarouselWidget;
  }

  interface UiSlotDataReferenceMap {
    'predict-feed': PredictFeedReference;
  }
}

export const isPredictFeedReference = (
  reference: UiSlotDataReference,
): reference is PredictFeedReference => reference.type === 'predict-feed';
