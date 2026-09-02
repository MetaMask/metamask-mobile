import { PREDICT_UI_SLOT_WIDGET_REGISTRY } from '../Predict/uiSlots/widgetRegistry';
import type { UiSlotWidgetRegistry } from './widgets/widgetRegistry';

/** Every widget this build can render, contributed by the owning feature. */
export const MOBILE_UI_SLOT_WIDGET_REGISTRY = {
  ...PREDICT_UI_SLOT_WIDGET_REGISTRY,
} satisfies UiSlotWidgetRegistry;
