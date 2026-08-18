import Engine from '../../../../core/Engine';
import type {
  UiSlot,
  UiSlotAction,
} from '../../../../core/Engine/controllers/ui-slots-controller/types';

export type UiSlotActionHandler = (slot: UiSlot, action: UiSlotAction) => void;
export type UiSlotActionRegistry = Partial<
  Record<UiSlotAction['actionId'], UiSlotActionHandler>
>;

export const CORE_UI_SLOT_ACTION_REGISTRY = {
  dismiss: (slot) => {
    Engine.context.UiSlotsController.dismissContent(slot.contentId);
  },
} satisfies UiSlotActionRegistry;

export function composeUiSlotActionRegistry(
  ...registries: UiSlotActionRegistry[]
): UiSlotActionRegistry {
  const registry: UiSlotActionRegistry = {};
  for (const entries of registries) {
    for (const [actionId, handler] of Object.entries(entries)) {
      const id = actionId as UiSlotAction['actionId'];
      if (registry[id]) {
        throw new Error(`Duplicate UI Slots action handler: ${id}`);
      }
      registry[id] = handler;
    }
  }
  return registry;
}
