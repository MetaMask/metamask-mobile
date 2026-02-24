import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import { captureException } from '@sentry/react-native';

/**
 * Migration 123: Clear deposit and withdrawal request queues from PerpsController
 *
 * Clears depositRequests and withdrawalRequests arrays to ensure users start fresh
 * with the new FIFO queue-based pending transaction tracking.
 *
 * These arrays are queues for tracking active/pending transactions only - they are
 * NOT used for displaying transaction history. Transaction history comes from the
 * HyperLiquid getUserHistory API.
 *
 * This also resets related progress/status flags to ensure a clean state.
 */
const migration = (state: unknown): unknown => {
  const migrationVersion = 123;

  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    if (
      !hasProperty(state.engine.backgroundState, 'PerpsController') ||
      !isObject(state.engine.backgroundState.PerpsController)
    ) {
      return state;
    }

    const perpsController = state.engine.backgroundState.PerpsController;

    if (hasProperty(perpsController, 'withdrawalRequests')) {
      perpsController.withdrawalRequests = [];
    }

    if (hasProperty(perpsController, 'depositRequests')) {
      perpsController.depositRequests = [];
    }

    if (hasProperty(perpsController, 'withdrawalProgress')) {
      perpsController.withdrawalProgress = {
        progress: 0,
        lastUpdated: Date.now(),
        activeWithdrawalId: null,
      };
    }

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
