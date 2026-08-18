import type {
  UiSlot,
  UiSlotAction,
} from '../../../core/Engine/controllers/ui-slots-controller/types';
import { PREDICT_UI_SLOT_ACTION_REGISTRY } from '../Predict/uiSlots/actionRegistry';
import {
  composeUiSlotActionRegistry,
  CORE_UI_SLOT_ACTION_REGISTRY,
} from './handlers/handlerRegistry';

const MOBILE_UI_SLOT_ACTION_REGISTRY = composeUiSlotActionRegistry(
  CORE_UI_SLOT_ACTION_REGISTRY,
  PREDICT_UI_SLOT_ACTION_REGISTRY,
);

export function executeUiSlotAction(slot: UiSlot, action: UiSlotAction): void {
  MOBILE_UI_SLOT_ACTION_REGISTRY[action.actionId]?.(slot, action);
}
