import { PREDICT_UI_SLOT_WIDGET_REGISTRY } from '../Predict/uiSlots/widgetRegistry';
import type { UiSlotWidgetRegistry } from './widgets/widgetRegistry';

export const MOBILE_UI_SLOT_WIDGET_REGISTRY =
  PREDICT_UI_SLOT_WIDGET_REGISTRY satisfies UiSlotWidgetRegistry;
