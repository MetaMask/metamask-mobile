import semver from 'semver';
import type { UiSlotDefinitions } from './slotDefinitions';
import type { UiSlot, UiSlotsPlatform, UiSlotsScreenResponse } from './types';

export type UiSlotsInterpretationRejectionCode =
  | 'missing-required-data-reference'
  | 'unknown-slot'
  | 'unsupported-data-reference'
  | 'unsupported-required-action'
  | 'unsupported-widget';

export interface UiSlotsInterpretationRejection {
  slotId: string;
  contentId: string;
  code: UiSlotsInterpretationRejectionCode;
}

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

    const unsupportedActions = (slot.actions ?? []).filter(
      (action) => !definition.actionIds.includes(action.actionId),
    );
    if (unsupportedActions.some((action) => action.required)) {
      reject('unsupported-required-action');
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

    slots.push({
      ...slot,
      actions: (slot.actions ?? []).filter((action) =>
        definition.actionIds.includes(action.actionId),
      ),
    });
  }
  return { slots, rejections };
}

export function applyUiSlotsClientRules({
  slots,
  dismissedContentIds,
  clientVersion,
  platform,
  now = Date.now(),
}: {
  slots: UiSlot[];
  dismissedContentIds: Record<string, number>;
  clientVersion: string;
  platform: UiSlotsPlatform;
  now?: number;
}): UiSlot[] {
  return slots.filter((slot) => {
    if (dismissedContentIds[slot.contentId]) {
      return false;
    }

    const minimumVersion = slot.compatibility?.[platform]?.minimumVersion;
    if (
      minimumVersion &&
      (!semver.valid(clientVersion) ||
        !semver.valid(minimumVersion) ||
        !semver.gte(clientVersion, minimumVersion))
    ) {
      return false;
    }

    const validFrom = slot.validity?.from
      ? Date.parse(slot.validity.from)
      : undefined;
    const validUntil = slot.validity?.until
      ? Date.parse(slot.validity.until)
      : undefined;

    if (
      (validFrom !== undefined &&
        (!Number.isFinite(validFrom) || now < validFrom)) ||
      (validUntil !== undefined &&
        (!Number.isFinite(validUntil) || now >= validUntil))
    ) {
      return false;
    }

    return true;
  });
}
