import {
  array,
  integer,
  literal,
  mask,
  object,
  optional,
  string,
  unknown,
  type Infer,
} from '@metamask/superstruct';
import type { UiSlot, UiSlotsScreenResponse } from '../types';
import type { UiSlotsContractRegistry } from './registry';

export type UiSlotsRejectionCode =
  | 'invalid-action'
  | 'invalid-data-reference'
  | 'invalid-slot'
  | 'invalid-widget'
  | 'missing-required-data-reference'
  | 'unknown-slot'
  | 'unknown-data-reference'
  | 'unknown-widget'
  | 'unsupported-data-reference'
  | 'unsupported-widget';

export interface UiSlotsRejection {
  index: number;
  code: UiSlotsRejectionCode;
}

export type UiSlotsResponseErrorCode =
  | 'duplicate-content-id'
  | 'duplicate-slot-id'
  | 'invalid-slot-structure';

export class UiSlotsResponseValidationError extends Error {
  readonly code: UiSlotsResponseErrorCode;
  readonly rejections: UiSlotsRejection[];

  constructor(
    code: UiSlotsResponseErrorCode,
    rejections: UiSlotsRejection[] = [],
  ) {
    super(code);
    this.name = 'UiSlotsResponseValidationError';
    this.code = code;
    this.rejections = rejections;
  }
}

class UiSlotsContractError extends Error {
  readonly code: UiSlotsRejectionCode;

  constructor(code: UiSlotsRejectionCode) {
    super(code);
    this.code = code;
  }
}

const envelopeSchema = object({
  contractVersion: literal(1),
  configurationVersion: string(),
  screenId: string(),
  locale: string(),
  publishedAt: string(),
  slots: array(unknown()),
});

const slotBaseSchema = object({
  slotId: string(),
  contentId: string(),
  revision: integer(),
  widget: unknown(),
  // Reserved: remote actions are not implemented yet, so a slot that depends on
  // one is rejected rather than rendered without its behaviour.
  actions: optional(array(unknown())),
  dataReferences: optional(array(unknown())),
});

function parseRegistered<T>(
  value: unknown,
  parsers: Record<string, (value: unknown) => T>,
  invalidCode: UiSlotsRejectionCode,
  unknownCode: UiSlotsRejectionCode,
): T {
  let base: { type: string };
  try {
    base = mask(value, object({ type: string() }));
  } catch {
    throw new UiSlotsContractError(invalidCode);
  }
  const parser = parsers[base.type];
  if (!parser) {
    throw new UiSlotsContractError(unknownCode);
  }
  try {
    return parser(value);
  } catch {
    throw new UiSlotsContractError(invalidCode);
  }
}

function parseUiSlot(
  base: Infer<typeof slotBaseSchema>,
  registry: UiSlotsContractRegistry,
): UiSlot {
  if (base.actions?.length) {
    throw new UiSlotsContractError('invalid-action');
  }
  const dataReferences = base.dataReferences?.map((reference) =>
    parseRegistered(
      reference,
      registry.dataReferences,
      'invalid-data-reference',
      'unknown-data-reference',
    ),
  );
  if (
    dataReferences &&
    new Set(dataReferences.map((reference) => reference.id)).size !==
      dataReferences.length
  ) {
    throw new UiSlotsContractError('invalid-data-reference');
  }

  const slot: UiSlot = {
    slotId: base.slotId,
    contentId: base.contentId,
    revision: base.revision,
    widget: parseRegistered(
      base.widget,
      registry.widgets,
      'invalid-widget',
      'unknown-widget',
    ),
    dataReferences,
  };
  const definition = registry.slots[slot.slotId];
  if (!definition) {
    throw new UiSlotsContractError('unknown-slot');
  }
  if (definition && !definition.widgetTypes.includes(slot.widget.type)) {
    throw new UiSlotsContractError('unsupported-widget');
  }
  if (
    definition &&
    !(dataReferences ?? []).every((reference) =>
      definition.dataReferenceTypes.includes(reference.type),
    )
  ) {
    throw new UiSlotsContractError('unsupported-data-reference');
  }
  if (
    definition?.requiredDataReferenceTypes?.some(
      (type) => !dataReferences?.some((reference) => reference.type === type),
    )
  ) {
    throw new UiSlotsContractError('missing-required-data-reference');
  }
  return slot;
}

export function parseUiSlotsResponse(
  value: unknown,
  registry: UiSlotsContractRegistry,
): {
  response: UiSlotsScreenResponse;
  rejections: UiSlotsRejection[];
} {
  const envelope = mask(value, envelopeSchema);
  const slots: UiSlot[] = [];
  const rejections: UiSlotsRejection[] = [];
  const candidates = envelope.slots.map((candidate, index) => {
    try {
      return { index, base: mask(candidate, slotBaseSchema) };
    } catch {
      throw new UiSlotsResponseValidationError('invalid-slot-structure');
    }
  });

  const slotIds = candidates.map(({ base }) => base.slotId);
  if (new Set(slotIds).size !== slotIds.length) {
    throw new UiSlotsResponseValidationError('duplicate-slot-id');
  }
  const contentIds = candidates.map(({ base }) => base.contentId);
  if (new Set(contentIds).size !== contentIds.length) {
    throw new UiSlotsResponseValidationError('duplicate-content-id');
  }

  for (const { index, base } of candidates) {
    try {
      slots.push(parseUiSlot(base, registry));
    } catch (error) {
      rejections.push({
        index,
        code:
          error instanceof UiSlotsContractError ? error.code : 'invalid-slot',
      });
    }
  }

  return {
    response: {
      ...envelope,
      screenId: envelope.screenId as UiSlotsScreenResponse['screenId'],
      slots,
    },
    rejections,
  };
}
