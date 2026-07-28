/**
 * __DEV__-only visual QA store for Perps slider-input screens:
 * - Close Position (`PerpsClosePositionView` — market + limit, slider / keypad)
 * - Add / Remove Margin (`PerpsAdjustMarginView` — shared slider template)
 *
 * Default selected state is always `live` (no overrides).
 */

import { useSyncExternalStore } from 'react';
import { strings } from '../../../../../locales/i18n';
import type { OrderType } from '@metamask/perps-controller';

export type PerpsSliderInputVisualPage = 'close' | 'margin';

export type PerpsClosePositionVisualStateId =
  | 'live'
  // Market
  | 'market_full'
  | 'market_partial_50'
  | 'market_zero'
  | 'market_keypad'
  // Limit
  | 'limit_with_price'
  | 'limit_missing_price'
  // Errors (blocking — Close disabled)
  | 'error_minimum_amount'
  | 'error_limit_price_too_far'
  | 'error_must_close_full'
  | 'error_no_amount_selected'
  // Warnings (non-blocking — shown under amount for visual QA)
  | 'warning_limit_price_far'
  | 'warning_negative_receive'
  // Misc
  | 'state_closing'
  // Add / Remove Margin (same slider template)
  | 'margin_full'
  | 'margin_partial_50'
  | 'margin_zero'
  | 'margin_keypad'
  | 'margin_adjusting'
  // Margin errors
  | 'error_margin_no_amount'
  | 'error_margin_exceeds_available'
  | 'error_margin_exceeds_removable';

export interface PerpsClosePositionVisualOverrides {
  forceOrderType?: OrderType;
  /** Force Market/Limit selector + limit UI even when remote flag is off. */
  forceLimitOrderEnabled?: boolean;
  forceClosePercentage?: number;
  forceLimitPrice?: string;
  forceInputFocused?: boolean;
  forceIsClosing?: boolean;
  forceConfirmDisabled?: boolean;
  /** Errors rendered under the amount (bypass production filter). */
  forceVisibleErrors?: string[];
  /** Warnings rendered under the amount (__DEV__ visual only). */
  forceVisibleWarnings?: string[];
  forceAmountHasError?: boolean;
  forceReceiveAmount?: number;
  forceTotalFees?: number;
  forceTotalMargin?: number;
  forceTotalPnl?: number;
  /** Margin slider: 0–100% of max addable/removable. */
  forceMarginPercentage?: number;
  forceIsAdjusting?: boolean;
}

export interface PerpsClosePositionVisualPreset {
  id: PerpsClosePositionVisualStateId;
  label: string;
  group: string;
  description?: string;
  /** Which screen(s) list this preset. `live` is shared. */
  pages: PerpsSliderInputVisualPage[];
}

const MINIMUM_ORDER_AMOUNT = 10;

export const PERPS_CLOSE_POSITION_VISUAL_PRESETS: PerpsClosePositionVisualPreset[] =
  [
    {
      id: 'live',
      label: 'Live (no override)',
      group: 'Control',
      description: 'Clear all forced UI; use real position / stream data',
      pages: ['close', 'margin'],
    },
    {
      id: 'market_full',
      label: 'Market — 100% close',
      group: 'Market',
      description: 'Full close, slider at 100%, Confirm enabled',
      pages: ['close'],
    },
    {
      id: 'market_partial_50',
      label: 'Market — 50% close',
      group: 'Market',
      description: 'Partial close via slider',
      pages: ['close'],
    },
    {
      id: 'market_zero',
      label: 'Market — 0% (empty)',
      group: 'Market',
      description: 'Slider at 0%; Confirm disabled',
      pages: ['close'],
    },
    {
      id: 'market_keypad',
      label: 'Market — keypad open',
      group: 'Market',
      description: 'USD keypad + percentage chips; slider hidden',
      pages: ['close'],
    },
    {
      id: 'limit_with_price',
      label: 'Limit — price set',
      group: 'Limit',
      description: 'Limit order with limit price row filled',
      pages: ['close'],
    },
    {
      id: 'limit_missing_price',
      label: 'Limit — set price',
      group: 'Limit',
      description:
        'Limit selected; price row shows Set price; Confirm disabled',
      pages: ['close'],
    },
    {
      id: 'error_minimum_amount',
      label: 'Error — below minimum',
      group: 'Errors',
      description: 'Partial close leaving / closing below minimum order size',
      pages: ['close'],
    },
    {
      id: 'error_limit_price_too_far',
      label: 'Error — limit price too far',
      group: 'Errors',
      description: 'Oracle band: price >95% from market',
      pages: ['close'],
    },
    {
      id: 'error_must_close_full',
      label: 'Error — must close 100%',
      group: 'Errors',
      description: 'Position value below minimum; must close full',
      pages: ['close'],
    },
    {
      id: 'error_no_amount_selected',
      label: 'Error — no amount selected',
      group: 'Errors',
      description: 'Market close at 0%; amount required',
      pages: ['close'],
    },
    {
      id: 'warning_limit_price_far',
      label: 'Warning — limit far from market',
      group: 'Warnings',
      description: 'Non-blocking; Confirm still enabled',
      pages: ['close'],
    },
    {
      id: 'warning_negative_receive',
      label: 'Warning — negative receive',
      group: 'Warnings',
      description: 'Fees/losses exceed recoverables; Confirm still enabled',
      pages: ['close'],
    },
    {
      id: 'state_closing',
      label: 'Closing (loading)',
      group: 'Misc',
      description: 'Confirm button loading / Closing…',
      pages: ['close'],
    },
    {
      id: 'margin_full',
      label: 'Margin — 100%',
      group: 'Margin',
      description: 'Slider at max addable/removable; Confirm enabled',
      pages: ['margin'],
    },
    {
      id: 'margin_partial_50',
      label: 'Margin — 50%',
      group: 'Margin',
      description: 'Partial margin via slider',
      pages: ['margin'],
    },
    {
      id: 'margin_zero',
      label: 'Margin — 0% (empty)',
      group: 'Margin',
      description: 'Slider at 0%; Confirm disabled',
      pages: ['margin'],
    },
    {
      id: 'margin_keypad',
      label: 'Margin — keypad open',
      group: 'Margin',
      description: 'USD keypad + percentage chips; slider hidden',
      pages: ['margin'],
    },
    {
      id: 'margin_adjusting',
      label: 'Margin — adjusting (loading)',
      group: 'Margin',
      description: 'Confirm button loading',
      pages: ['margin'],
    },
    {
      id: 'error_margin_no_amount',
      label: 'Error — no amount',
      group: 'Errors',
      description: 'HelpText under limit price; Confirm disabled',
      pages: ['margin'],
    },
    {
      id: 'error_margin_exceeds_available',
      label: 'Error — exceeds available (add)',
      group: 'Errors',
      description: 'Amount above margin available to add',
      pages: ['margin'],
    },
    {
      id: 'error_margin_exceeds_removable',
      label: 'Error — exceeds removable (remove)',
      group: 'Errors',
      description: 'Amount above max removable margin',
      pages: ['margin'],
    },
  ];

export function getOverridesForClosePositionState(
  id: PerpsClosePositionVisualStateId,
): PerpsClosePositionVisualOverrides | null {
  switch (id) {
    case 'live':
      return null;

    case 'market_full':
      return {
        forceOrderType: 'market',
        forceLimitOrderEnabled: true,
        forceClosePercentage: 100,
        forceInputFocused: false,
      };

    case 'market_partial_50':
      return {
        forceOrderType: 'market',
        forceLimitOrderEnabled: true,
        forceClosePercentage: 50,
        forceInputFocused: false,
      };

    case 'market_zero':
      return {
        forceOrderType: 'market',
        forceLimitOrderEnabled: true,
        forceClosePercentage: 0,
        forceConfirmDisabled: true,
        forceInputFocused: false,
      };

    case 'market_keypad':
      return {
        forceOrderType: 'market',
        forceLimitOrderEnabled: true,
        forceClosePercentage: 50,
        forceInputFocused: true,
      };

    case 'limit_with_price':
      return {
        forceOrderType: 'limit',
        forceLimitOrderEnabled: true,
        forceClosePercentage: 100,
        forceLimitPrice: '50000',
        forceInputFocused: false,
      };

    case 'limit_missing_price':
      return {
        forceOrderType: 'limit',
        forceLimitOrderEnabled: true,
        forceClosePercentage: 100,
        forceLimitPrice: '',
        forceConfirmDisabled: true,
        forceInputFocused: false,
      };

    case 'error_minimum_amount':
      return {
        forceOrderType: 'market',
        forceLimitOrderEnabled: true,
        forceClosePercentage: 5,
        forceVisibleErrors: [
          strings('perps.order.validation.minimum_amount', {
            amount: String(MINIMUM_ORDER_AMOUNT),
          }),
        ],
        forceAmountHasError: true,
        forceConfirmDisabled: true,
        forceInputFocused: false,
      };

    case 'error_limit_price_too_far':
      return {
        forceOrderType: 'limit',
        forceLimitOrderEnabled: true,
        forceClosePercentage: 100,
        forceLimitPrice: '1000',
        forceVisibleErrors: [
          strings('perps.order.limit_price_modal.limit_price_too_far'),
        ],
        forceAmountHasError: true,
        forceConfirmDisabled: true,
        forceInputFocused: false,
      };

    case 'error_must_close_full':
      return {
        forceOrderType: 'market',
        forceLimitOrderEnabled: true,
        forceClosePercentage: 50,
        forceVisibleErrors: [
          strings('perps.close_position.must_close_full_below_minimum'),
        ],
        forceAmountHasError: true,
        forceConfirmDisabled: true,
        forceInputFocused: false,
      };

    case 'error_no_amount_selected':
      return {
        forceOrderType: 'market',
        forceLimitOrderEnabled: true,
        forceClosePercentage: 0,
        forceVisibleErrors: [
          strings('perps.close_position.no_amount_selected'),
        ],
        forceAmountHasError: true,
        forceConfirmDisabled: true,
        forceInputFocused: false,
      };

    case 'warning_limit_price_far':
      return {
        forceOrderType: 'limit',
        forceLimitOrderEnabled: true,
        forceClosePercentage: 100,
        forceLimitPrice: '60000',
        forceVisibleWarnings: [
          strings('perps.order.validation.limit_price_far_warning'),
        ],
        forceInputFocused: false,
      };

    case 'warning_negative_receive':
      return {
        forceOrderType: 'market',
        forceLimitOrderEnabled: true,
        forceClosePercentage: 100,
        forceReceiveAmount: -2.5,
        forceVisibleWarnings: [
          strings('perps.close_position.negative_receive_warning', {
            amount: '2.50',
          }),
        ],
        forceInputFocused: false,
      };

    case 'state_closing':
      return {
        forceOrderType: 'market',
        forceLimitOrderEnabled: true,
        forceClosePercentage: 100,
        forceIsClosing: true,
        forceInputFocused: false,
      };

    case 'margin_full':
      return {
        forceMarginPercentage: 100,
        forceInputFocused: false,
      };

    case 'margin_partial_50':
      return {
        forceMarginPercentage: 50,
        forceInputFocused: false,
      };

    case 'margin_zero':
      return {
        forceMarginPercentage: 0,
        forceConfirmDisabled: true,
        forceInputFocused: false,
      };

    case 'margin_keypad':
      return {
        forceMarginPercentage: 50,
        forceInputFocused: true,
      };

    case 'margin_adjusting':
      return {
        forceMarginPercentage: 100,
        forceIsAdjusting: true,
        forceInputFocused: false,
      };

    case 'error_margin_no_amount':
      return {
        forceMarginPercentage: 0,
        forceVisibleErrors: [strings('perps.adjust_margin.no_amount_selected')],
        forceAmountHasError: true,
        forceConfirmDisabled: true,
        forceInputFocused: false,
      };

    case 'error_margin_exceeds_available':
      return {
        forceMarginPercentage: 100,
        forceVisibleErrors: [strings('perps.adjust_margin.exceeds_available')],
        forceAmountHasError: true,
        forceConfirmDisabled: true,
        forceInputFocused: false,
      };

    case 'error_margin_exceeds_removable':
      return {
        forceMarginPercentage: 100,
        forceVisibleErrors: [
          strings('perps.errors.marginValidation.exceedsMaxRemovable'),
        ],
        forceAmountHasError: true,
        forceConfirmDisabled: true,
        forceInputFocused: false,
      };

    default:
      return null;
  }
}

/** Margin-page overrides; close-only presets resolve to `null` (live). */
export function getOverridesForMarginState(
  id: PerpsClosePositionVisualStateId,
): PerpsClosePositionVisualOverrides | null {
  switch (id) {
    case 'live':
      return null;
    case 'margin_full':
    case 'margin_partial_50':
    case 'margin_zero':
    case 'margin_keypad':
    case 'margin_adjusting':
    case 'error_margin_no_amount':
    case 'error_margin_exceeds_available':
    case 'error_margin_exceeds_removable':
      return getOverridesForClosePositionState(id);
    default:
      return null;
  }
}

type Listener = () => void;

let selectedStateId: PerpsClosePositionVisualStateId = 'live';
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function getPerpsClosePositionVisualStateId(): PerpsClosePositionVisualStateId {
  return selectedStateId;
}

export function setPerpsClosePositionVisualStateId(
  id: PerpsClosePositionVisualStateId,
): void {
  if (!__DEV__) {
    return;
  }
  if (selectedStateId === id) {
    return;
  }
  selectedStateId = id;
  emit();
}

export function subscribePerpsClosePositionVisualState(
  listener: Listener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePerpsClosePositionVisualOverrides(): PerpsClosePositionVisualOverrides | null {
  const id = useSyncExternalStore(
    subscribePerpsClosePositionVisualState,
    getPerpsClosePositionVisualStateId,
    getPerpsClosePositionVisualStateId,
  );
  if (!__DEV__) {
    return null;
  }
  // Close-only application: ignore margin-only preset ids.
  const preset = PERPS_CLOSE_POSITION_VISUAL_PRESETS.find((p) => p.id === id);
  if (preset && !preset.pages.includes('close')) {
    return null;
  }
  return getOverridesForClosePositionState(id);
}

export function usePerpsMarginVisualOverrides(): PerpsClosePositionVisualOverrides | null {
  const id = useSyncExternalStore(
    subscribePerpsClosePositionVisualState,
    getPerpsClosePositionVisualStateId,
    getPerpsClosePositionVisualStateId,
  );
  if (!__DEV__) {
    return null;
  }
  return getOverridesForMarginState(id);
}

export function getPerpsClosePositionVisualPresetGroups(
  page: PerpsSliderInputVisualPage = 'close',
): {
  group: string;
  presets: PerpsClosePositionVisualPreset[];
}[] {
  const groups: {
    group: string;
    presets: PerpsClosePositionVisualPreset[];
  }[] = [];
  for (const preset of PERPS_CLOSE_POSITION_VISUAL_PRESETS) {
    if (!preset.pages.includes(page)) {
      continue;
    }
    const existing = groups.find((g) => g.group === preset.group);
    if (existing) {
      existing.presets.push(preset);
    } else {
      groups.push({ group: preset.group, presets: [preset] });
    }
  }
  return groups;
}
