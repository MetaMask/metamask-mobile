import type { ComponentType } from 'react';
import type {
  UiSlot,
  UiSlotWidget,
} from '../../../core/Engine/controllers/ui-slots-controller/types';
import { PredictDiscoveryListSlotWidget } from '../PredictNext/homeSection/PredictDiscoveryListSlotWidget';

/**
 * Mobile-owned widget registrations. Feature modules own their widgets; the
 * generic renderer consumes this aggregate only. Predict's widget switches
 * on the Active Venue itself, so this registry stays Venue-neutral.
 */
export const MOBILE_UI_SLOT_WIDGETS = {
  'predict-discovery-list': PredictDiscoveryListSlotWidget,
} satisfies Record<UiSlotWidget['type'], ComponentType<{ slot: UiSlot }>>;
