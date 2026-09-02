import type { UiSlotDefinitions } from './slotDefinitions';
import type { UiSlot, UiSlotsScreenResponse } from './types';

export type UiSlotsInterpretationRejectionCode =
  | 'missing-required-data-reference'
  | 'unknown-slot'
  | 'unsupported-data-reference'
  | 'unsupported-widget';

export interface UiSlotsInterpretationRejection {
  slotId: string;
  contentId: string;
  code: UiSlotsInterpretationRejectionCode;
}

/**
 * Drops slots this build cannot render: unknown slot ids, and widgets or
 * data references outside the capabilities the host declared for the slot.
 */
export function interpretScreenConfiguration(
  response: UiSlotsScreenResponse,
  definitions: UiSlotDefinitions,
): {
  slots: UiSlot[];
  rejections: UiSlotsInterpretationRejection[];
} {
  const slots: UiSlot[] = [];
  const rejections: UiSlotsInterpretationRejection[] = [];
  for (const slot of response.slots) {
    const definition = definitions[slot.slotId];
    const reject = (code: UiSlotsInterpretationRejectionCode) =>
      rejections.push({
        slotId: slot.slotId,
        contentId: slot.contentId,
        code,
      });

    if (!definition) {
      reject('unknown-slot');
      continue;
    }
    if (!definition.widgetTypes.includes(slot.widget.type)) {
      reject('unsupported-widget');
      continue;
    }

    if (
      !(slot.dataReferences ?? []).every((reference) =>
        definition.dataReferenceTypes.includes(reference.type),
      )
    ) {
      reject('unsupported-data-reference');
      continue;
    }

    if (
      !(definition.requiredDataReferenceTypes ?? []).every((requiredType) =>
        slot.dataReferences?.some(
          (reference) => reference.type === requiredType,
        ),
      )
    ) {
      reject('missing-required-data-reference');
      continue;
    }

    slots.push(slot);
  }
  return { slots, rejections };
}
