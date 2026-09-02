import type { UiSlotWidgetRegistry } from '../../UiSlots/widgets/widgetRegistry';
import { PredictDiscoveryListWidget } from './widgets/PredictDiscoveryListWidget';

export const PREDICT_UI_SLOT_WIDGET_REGISTRY = {
  'predict-discovery-list': PredictDiscoveryListWidget,
} satisfies UiSlotWidgetRegistry;
