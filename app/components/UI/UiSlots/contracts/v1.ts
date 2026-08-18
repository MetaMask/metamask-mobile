import {
  boolean,
  literal,
  mask,
  object,
  optional,
  string,
} from '@metamask/superstruct';
import type { PartialUiSlotsContractRegistry } from '../../../../core/Engine/controllers/ui-slots-controller/contracts/registry';
import type {
  UiSlotAction,
  UiSlotWidget,
} from '../../../../core/Engine/controllers/ui-slots-controller/types';

const ALERT_BANNER_TONES = new Set([
  'neutral',
  'info',
  'success',
  'warning',
  'danger',
]);

const alertBannerWidgetSchema = object({
  type: literal('alert-banner'),
  schemaVersion: literal(1),
  props: object({
    tone: string(),
    title: string(),
    description: string(),
  }),
});

const dismissActionSchema = object({
  actionId: literal('dismiss'),
  trigger: literal('close'),
  params: object({
    scope: literal('content'),
  }),
  required: optional(boolean()),
});

const navigateDeeplinkActionSchema = object({
  actionId: literal('navigate-deeplink'),
  trigger: literal('press'),
  params: object({
    deeplink: string(),
  }),
  required: optional(boolean()),
});

export const CORE_UI_SLOTS_V1_CONTRACTS: PartialUiSlotsContractRegistry = {
  widgets: {
    'alert-banner': (value) => {
      const widget = mask(value, alertBannerWidgetSchema);
      if (!ALERT_BANNER_TONES.has(widget.props.tone)) {
        throw new Error('Unknown alert banner tone.');
      }
      return widget as UiSlotWidget;
    },
  },
  actions: {
    dismiss: (value) => mask(value, dismissActionSchema) as UiSlotAction,
    'navigate-deeplink': (value) =>
      mask(value, navigateDeeplinkActionSchema) as UiSlotAction,
  },
};
