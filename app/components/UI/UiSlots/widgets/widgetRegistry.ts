import type React from 'react';
import type {
  UiSlot,
  UiSlotWidget,
} from '../../../../core/Engine/controllers/ui-slots-controller/types';

export type UiSlotWidgetRegistry = Partial<
  Record<UiSlotWidget['type'], React.ComponentType<{ slot: UiSlot }>>
>;
