import {
  array,
  boolean,
  integer,
  literal,
  mask,
  object,
  optional,
  string,
  unknown,
} from '@metamask/superstruct';
import type { UiSlot, UiSlotAction, UiSlotsScreenResponse } from '../types';
import type { UiSlotsContractRegistry } from './registry';

export type UiSlotsRejectionCode =
  | 'invalid-action'
  | 'invalid-data-reference'
  | 'invalid-slot'
  | 'invalid-widget'
  | 'unknown-data-reference'
  | 'unknown-required-action'
  | 'unknown-widget';

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
  compatibility: optional(
    object({
      mobile: optional(
        object({
          minimumVersion: string(),
        }),
      ),
      extension: optional(
        object({
          minimumVersion: string(),
        }),
      ),
    }),
  ),
  validity: optional(
    object({
      from: optional(string()),
      until: optional(string()),
    }),
  ),
  widget: unknown(),
  actions: optional(array(unknown())),
  dataReferences: optional(array(unknown())),
});

function parseWidget(value: unknown, registry: UiSlotsContractRegistry) {
  let base: { type: string };
  try {
    base = mask(value, object({ type: string() }));
  } catch {
    throw new UiSlotsContractError('invalid-widget');
  }
  const parser = registry.widgets[base.type];
  if (!parser) {
    throw new UiSlotsContractError('unknown-widget');
  }
  try {
    return parser(value);
  } catch {
    throw new UiSlotsContractError('invalid-widget');
  }
}

function parseAction(
  value: unknown,
  registry: UiSlotsContractRegistry,
): UiSlotAction | undefined {
  let base: { actionId: string; required?: boolean };
  try {
    base = mask(
      value,
      object({
        actionId: string(),
        required: optional(boolean()),
      }),
    );
  } catch {
    throw new UiSlotsContractError('invalid-action');
  }

  const parser = registry.actions[base.actionId];
  if (parser) {
    try {
      return parser(value);
    } catch {
      throw new UiSlotsContractError('invalid-action');
    }
  }
  if (base.required) {
    throw new UiSlotsContractError('unknown-required-action');
  }
  return undefined;
}

function parseDataReference(value: unknown, registry: UiSlotsContractRegistry) {
  let base: { type: string };
  try {
    base = mask(value, object({ type: string() }));
  } catch {
    throw new UiSlotsContractError('invalid-data-reference');
  }
  const parser = registry.dataReferences[base.type];
  if (!parser) {
    throw new UiSlotsContractError('unknown-data-reference');
  }
  try {
    return parser(value);
  } catch {
    throw new UiSlotsContractError('invalid-data-reference');
  }
}

function parseSlotBase(value: unknown) {
  return mask(value, slotBaseSchema);
}

function parseUiSlot(
  base: ReturnType<typeof parseSlotBase>,
  registry: UiSlotsContractRegistry,
): UiSlot {
  return {
    slotId: base.slotId,
    contentId: base.contentId,
    revision: base.revision,
    compatibility: base.compatibility,
    validity: base.validity,
    widget: parseWidget(base.widget, registry),
    actions: base.actions
      ?.map((action) => parseAction(action, registry))
      .filter((action): action is UiSlotAction => action !== undefined),
    dataReferences: base.dataReferences?.map((reference) =>
      parseDataReference(reference, registry),
    ),
  };
}

export function parseUiSlotsResponse(
  value: unknown,
  registry: UiSlotsContractRegistry,
): {
  response: UiSlotsScreenResponse;
  rejectedSlotCount: number;
  rejections: UiSlotsRejection[];
} {
  const envelope = mask(value, envelopeSchema);
  const slots: UiSlot[] = [];
  const rejections: UiSlotsRejection[] = [];
  const candidates = envelope.slots.map((candidate, index) => {
    try {
      return { index, base: parseSlotBase(candidate) };
    } catch {
      throw new UiSlotsResponseValidationError('invalid-slot-structure');
    }
  });

  const slotIds = new Set<string>();
  const contentIds = new Set<string>();
  for (const { base } of candidates) {
    if (slotIds.has(base.slotId)) {
      throw new UiSlotsResponseValidationError('duplicate-slot-id');
    }
    if (contentIds.has(base.contentId)) {
      throw new UiSlotsResponseValidationError('duplicate-content-id');
    }
    slotIds.add(base.slotId);
    contentIds.add(base.contentId);
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
    rejectedSlotCount: rejections.length,
    rejections,
  };
}
