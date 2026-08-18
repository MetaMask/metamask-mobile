import type { UiSlotWidgetRegistry } from '../../UiSlots/widgets/widgetRegistry';
import { MarketCarouselWidget } from './widgets/MarketCarouselWidget';

export const PREDICT_UI_SLOT_WIDGET_REGISTRY = {
  'market-carousel': MarketCarouselWidget,
} satisfies UiSlotWidgetRegistry;
