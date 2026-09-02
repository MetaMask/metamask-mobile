import type { UiSlotDataReference, UiSlotWidget } from '../types';

export interface UiSlotsContractRegistry {
  widgets: Record<string, (value: unknown) => UiSlotWidget>;
  dataReferences: Record<string, (value: unknown) => UiSlotDataReference>;
}

export type PartialUiSlotsContractRegistry = Partial<{
  [Key in keyof UiSlotsContractRegistry]: Partial<UiSlotsContractRegistry[Key]>;
}>;

export function composeUiSlotsContractRegistry(
  ...registries: PartialUiSlotsContractRegistry[]
): UiSlotsContractRegistry {
  const result: UiSlotsContractRegistry = {
    widgets: {},
    dataReferences: {},
  };

  for (const registry of registries) {
    for (const category of Object.keys(
      result,
    ) as (keyof UiSlotsContractRegistry)[]) {
      for (const [type, parser] of Object.entries(registry[category] ?? {})) {
        if (result[category][type]) {
          throw new Error(`Duplicate UI Slots ${category} contract: ${type}`);
        }
        result[category][type] = parser;
      }
    }
  }

  return result;
}
