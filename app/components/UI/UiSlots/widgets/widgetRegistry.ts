import type React from 'react';
import type {
  UiSlot,
  UiSlotWidget,
} from '../../../../core/Engine/controllers/ui-slots-controller/types';
import { AlertBannerWidget } from './AlertBannerWidget';

export type UiSlotWidgetRegistry = Partial<
  Record<UiSlotWidget['type'], React.ComponentType<{ slot: UiSlot }>>
>;

export const CORE_UI_SLOT_WIDGET_REGISTRY = {
  'alert-banner': AlertBannerWidget,
} satisfies UiSlotWidgetRegistry;

export function composeUiSlotWidgetRegistry(
  ...registries: UiSlotWidgetRegistry[]
): UiSlotWidgetRegistry {
  const registry: UiSlotWidgetRegistry = {};
  for (const entries of registries) {
    for (const [widgetType, component] of Object.entries(entries)) {
      const type = widgetType as UiSlotWidget['type'];
      if (registry[type]) {
        throw new Error(`Duplicate UI Slots widget: ${type}`);
      }
      registry[type] = component;
    }
  }
  return registry;
}
