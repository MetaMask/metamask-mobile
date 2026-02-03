import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import { captureException } from '@sentry/react-native';

export const migrationVersion = 115;

function isResourceStateShape(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    hasProperty(value as object, 'data') &&
    hasProperty(value as object, 'isLoading')
  );
}

function createDefaultResourceState<TData, TSelected = null>(
  data: TData,
  selected: TSelected = null as TSelected,
): {
  data: TData;
  selected: TSelected;
  isLoading: boolean;
  error: string | null;
} {
  return {
    data,
    selected,
    isLoading: false,
    error: null,
  };
}

/**
 * Migration 115: Migrate RampsController legacy state to ResourceState shape
 *
 * RampsController was updated to use nested ResourceState for providers, tokens,
 * paymentMethods, countries, and quotes. Legacy state had e.g. providers as an
 * array and selectedProvider at top level. This migration normalizes those fields
 * to { data, selected, isLoading, error } and removes top-level selectedProvider,
 * selectedToken, selectedPaymentMethod. userRegion is handled by migration 116.
 *
 * @param state - The persisted Redux state (with engine.backgroundState inflated)
 * @returns The migrated Redux state
 */
export default function migrate(state: unknown): unknown {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    if (!hasProperty(state.engine.backgroundState, 'RampsController')) {
      return state;
    }

    const ramps = state.engine.backgroundState.RampsController as Record<
      string,
      unknown
    >;

    if (!isObject(ramps)) {
      return state;
    }

    const selectedProvider = hasProperty(ramps, 'selectedProvider')
      ? (ramps.selectedProvider as unknown)
      : null;
    const selectedToken = hasProperty(ramps, 'selectedToken')
      ? (ramps.selectedToken as unknown)
      : null;
    const selectedPaymentMethod = hasProperty(ramps, 'selectedPaymentMethod')
      ? (ramps.selectedPaymentMethod as unknown)
      : null;

    const normalized: Record<string, unknown> = { ...ramps };
    delete normalized.selectedProvider;
    delete normalized.selectedToken;
    delete normalized.selectedPaymentMethod;

    if (Array.isArray(ramps.providers)) {
      normalized.providers = createDefaultResourceState(
        ramps.providers,
        selectedProvider ?? null,
      );
    }

    if (ramps.tokens != null && !isResourceStateShape(ramps.tokens)) {
      normalized.tokens = createDefaultResourceState(
        ramps.tokens,
        selectedToken ?? null,
      );
    }

    if (Array.isArray(ramps.paymentMethods)) {
      normalized.paymentMethods = createDefaultResourceState(
        ramps.paymentMethods,
        selectedPaymentMethod ?? null,
      );
    }

    if (Array.isArray(ramps.countries)) {
      normalized.countries = createDefaultResourceState(ramps.countries, null);
    }

    if (ramps.quotes != null && !isResourceStateShape(ramps.quotes)) {
      normalized.quotes = createDefaultResourceState(ramps.quotes, null);
    }

    (state.engine.backgroundState as Record<string, unknown>).RampsController =
      normalized;
    return state;
  } catch (error) {
    captureException(
      new Error(`Migration ${migrationVersion} failed: ${error}`),
    );
    return state;
  }
}
