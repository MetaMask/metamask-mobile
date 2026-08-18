import { PREDICT_UI_SLOT_WIDGET_REGISTRY } from '../Predict/uiSlots/widgetRegistry';
import {
  composeUiSlotWidgetRegistry,
  CORE_UI_SLOT_WIDGET_REGISTRY,
} from './widgets/widgetRegistry';

export const MOBILE_UI_SLOT_WIDGET_REGISTRY = composeUiSlotWidgetRegistry(
  CORE_UI_SLOT_WIDGET_REGISTRY,
  PREDICT_UI_SLOT_WIDGET_REGISTRY,
);
