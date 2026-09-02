import type { UiSlotDataReference, UiSlotWidget } from './types';

export interface UiSlotDefinition {
  widgetTypes: readonly UiSlotWidget['type'][];
  dataReferenceTypes: readonly UiSlotDataReference['type'][];
  requiredDataReferenceTypes?: readonly UiSlotDataReference['type'][];
}

export type UiSlotDefinitions = Record<string, UiSlotDefinition>;

export function composeUiSlotDefinitions(
  ...definitionGroups: UiSlotDefinitions[]
): UiSlotDefinitions {
  const definitions: UiSlotDefinitions = {};
  for (const group of definitionGroups) {
    for (const [slotId, definition] of Object.entries(group)) {
      if (definitions[slotId]) {
        throw new Error(`Duplicate UI Slots definition: ${slotId}`);
      }
      definitions[slotId] = definition;
    }
  }
  return definitions;
}
