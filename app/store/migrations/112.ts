import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import { captureException } from '@sentry/react-native';

/**
 * Migration 112: Clear stuck pending withdrawal requests from PerpsController
 *
 * This migration removes withdrawal requests with 'pending' or 'bridging' status
 * that may be stuck from before the withdrawal flow fixes. Users upgrading to
 * the new version will start fresh without stuck pending indicators.
 *
 * Completed and failed withdrawals are preserved for transaction history.
 */
const migration = (state: unknown): unknown => {
  const migrationVersion = 112;

  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    if (
      !hasProperty(state.engine.backgroundState, 'PerpsController') ||
      !isObject(state.engine.backgroundState.PerpsController)
    ) {
      // PerpsController doesn't exist yet, nothing to migrate
      return state;
    }

    const perpsController = state.engine.backgroundState.PerpsController;

    if (
      !hasProperty(perpsController, 'withdrawalRequests') ||
      !Array.isArray(perpsController.withdrawalRequests)
    ) {
      // No withdrawalRequests to migrate
      return state;
    }

    // Filter out pending/bridging withdrawals that may be stuck
    // Keep completed and failed ones for transaction history
    perpsController.withdrawalRequests =
      perpsController.withdrawalRequests.filter((request: unknown) => {
        if (!isObject(request) || !hasProperty(request, 'status')) {
          return false; // Remove invalid entries
        }
        const status = request.status;
        return status !== 'pending' && status !== 'bridging';
      });

    // Reset withdrawal progress to prevent stale references to removed withdrawals
    if (hasProperty(perpsController, 'withdrawalProgress')) {
      perpsController.withdrawalProgress = {
        progress: 0,
        lastUpdated: Date.now(),
        activeWithdrawalId: null,
      };
    }

    return state;
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to clear stuck pending withdrawal requests: ${String(
          error,
        )}`,
      ),
    );
    return state;
  }
};

export default migration;
