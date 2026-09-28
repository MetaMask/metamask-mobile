import type { ComponentType } from 'react';
import type {
  UiSlot,
  UiSlotWidget,
} from '../../../core/Engine/controllers/ui-slots-controller/types';
import { PredictDiscoveryListWidget } from '../Predict/uiSlots/widgets/PredictDiscoveryListWidget';

/**
 * Mobile-owned widget registrations. Feature modules own their widgets; the
 * generic renderer consumes this aggregate only.
 */
export const MOBILE_UI_SLOT_WIDGETS = {
  'predict-discovery-list': PredictDiscoveryListWidget,
} satisfies Record<UiSlotWidget['type'], ComponentType<{ slot: UiSlot }>>;
