import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import { captureException } from '@sentry/react-native';

export const migrationVersion = 125;

function isResourceStateShape(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    hasProperty(value as object, 'data') &&
    hasProperty(value as object, 'isLoading')
  );
}

/**
 * Migration 125: Backfill status field on ResourceState objects
 *
 * RampsController ResourceState type was updated to include a status field
 * ('idle' | 'loading' | 'success' | 'error'). Migration 117 created ResourceState
 * objects without this field. This migration adds status: 'idle' to any
 * ResourceState that is missing it.
 *
 * Target fields:
 * - RampsController.providers
 * - RampsController.tokens
 * - RampsController.paymentMethods
 * - RampsController.countries
 * - RampsController.nativeProviders.transak.userDetails
 * - RampsController.nativeProviders.transak.buyQuote
 * - RampsController.nativeProviders.transak.kycRequirement
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

    // Backfill status on top-level resource fields
    const topLevelFields = [
      'providers',
      'tokens',
      'paymentMethods',
      'countries',
    ];

    for (const field of topLevelFields) {
      if (
        hasProperty(ramps, field) &&
        isResourceStateShape(ramps[field]) &&
        (ramps[field] as Record<string, unknown>).status == null
      ) {
        (ramps[field] as Record<string, unknown>).status = 'idle';
      }
    }

    // Backfill status on Transak sub-states
    if (
      hasProperty(ramps, 'nativeProviders') &&
      isObject(ramps.nativeProviders)
    ) {
      const nativeProviders = ramps.nativeProviders as Record<string, unknown>;

      if (
        hasProperty(nativeProviders, 'transak') &&
        isObject(nativeProviders.transak)
      ) {
        const transak = nativeProviders.transak as Record<string, unknown>;

        const transakFields = ['userDetails', 'buyQuote', 'kycRequirement'];

        for (const field of transakFields) {
          if (
            hasProperty(transak, field) &&
            isResourceStateShape(transak[field]) &&
            (transak[field] as Record<string, unknown>).status == null
          ) {
            (transak[field] as Record<string, unknown>).status = 'idle';
          }
        }
      }
    }

    return state;
  } catch (error) {
    captureException(
      new Error(`Migration ${migrationVersion} failed: ${error}`),
    );
    return state;
  }
}
