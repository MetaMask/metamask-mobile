import { literal, mask, object, optional, string } from '@metamask/superstruct';
import type { PartialUiSlotsContractRegistry } from '../../../../../core/Engine/controllers/ui-slots-controller/contracts/registry';
import type { UiSlotWidget } from '../../../../../core/Engine/controllers/ui-slots-controller/types';
import {
  PREDICT_FEED_IDS,
  type PredictFeedReference,
} from '../../types/references';

const PREDICT_FEEDS = new Set<string>(PREDICT_FEED_IDS);

const marketCarouselWidgetSchema = object({
  type: literal('market-carousel'),
  schemaVersion: literal(1),
  props: object({
    title: optional(string()),
  }),
});

const predictFeedReferenceSchema = object({
  id: string(),
  type: literal('predict-feed'),
  params: object({
    venue: literal('polymarket'),
    feedId: string(),
  }),
});

export const PREDICT_UI_SLOTS_V1_CONTRACTS: PartialUiSlotsContractRegistry = {
  widgets: {
    'market-carousel': (value) =>
      mask(value, marketCarouselWidgetSchema) as UiSlotWidget,
  },
  dataReferences: {
    'predict-feed': (value) => {
      const reference = mask(value, predictFeedReferenceSchema);
      if (!PREDICT_FEEDS.has(reference.params.feedId)) {
        throw new Error('Unknown Predict feed reference.');
      }
      return reference as PredictFeedReference;
    },
  },
};
