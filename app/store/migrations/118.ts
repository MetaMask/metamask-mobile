import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import { captureException } from '@sentry/react-native';

/**
 * Migration 118: Clear deposit and withdrawal request queues from PerpsController
 *
 * This migration clears the depositRequests and withdrawalRequests arrays to ensure
 * users start fresh with the new FIFO queue-based pending transaction tracking.
 *
 * These arrays are queues for tracking active/pending transactions only - they are
 * NOT used for displaying transaction history. Transaction history comes from the
 * HyperLiquid getUserHistory API.
 *
 * This also resets related progress/status flags to ensure a clean state.
 */
const migration = (state: unknown): unknown => {
  const migrationVersion = 118;

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

    // Clear withdrawal requests queue
    if (hasProperty(perpsController, 'withdrawalRequests')) {
      perpsController.withdrawalRequests = [];
    }

    // Clear deposit requests queue
    if (hasProperty(perpsController, 'depositRequests')) {
      perpsController.depositRequests = [];
    }

    // Reset withdrawal progress
    if (hasProperty(perpsController, 'withdrawalProgress')) {
      perpsController.withdrawalProgress = {
        progress: 0,
        lastUpdated: Date.now(),
        activeWithdrawalId: null,
      };
    }

    // Reset in-progress flags
    if (hasProperty(perpsController, 'withdrawInProgress')) {
      perpsController.withdrawInProgress = false;
    }

    if (hasProperty(perpsController, 'depositInProgress')) {
      perpsController.depositInProgress = false;
    }

    return state;
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to clear transaction request queues: ${String(
          error,
        )}`,
      ),
    );
    return state;
  }
};

export default migration;
