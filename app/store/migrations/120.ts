import { hasProperty, isObject } from '@metamask/utils';
import { captureException } from '@sentry/react-native';
import { ensureValidState } from './util';

export const migrationVersion = 120;

/**
 * Migration 120: Remove snapshot state from rewards reducer and controller
 *
 * This migration removes deprecated snapshot-related properties from the rewards
 * reducer state and RewardsController state that are no longer used after the
 * snapshots feature was removed.
 *
 * Removes the following properties from state.rewards:
 * - snapshots: SnapshotDto[] | null
 * - snapshotsLoading: boolean
 * - snapshotsError: boolean
 *
 * Removes the following properties from state.engine.backgroundState.RewardsController:
 * - snapshots: { [seasonId: string]: SnapshotsCacheState }
 */
export default function migrate(state: unknown): unknown {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    // Remove snapshot properties from Redux rewards reducer state
    if (hasProperty(state, 'rewards') && isObject(state.rewards)) {
      const rewardsState = state.rewards;

      if (hasProperty(rewardsState, 'snapshots')) {
        delete rewardsState.snapshots;
      }

      if (hasProperty(rewardsState, 'snapshotsLoading')) {
        delete rewardsState.snapshotsLoading;
      }

      if (hasProperty(rewardsState, 'snapshotsError')) {
        delete rewardsState.snapshotsError;
      }
    }

    // Remove snapshot properties from RewardsController state
    if (
      hasProperty(state, 'engine') &&
      isObject(state.engine) &&
      hasProperty(state.engine, 'backgroundState') &&
      isObject(state.engine.backgroundState) &&
      hasProperty(state.engine.backgroundState, 'RewardsController') &&
      isObject(state.engine.backgroundState.RewardsController)
    ) {
      const rewardsController = state.engine.backgroundState.RewardsController;

      if (hasProperty(rewardsController, 'snapshots')) {
        delete rewardsController.snapshots;
      }
    }

    return state;
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to remove snapshot state: ${String(
          error,
        )}`,
      ),
    );
    // Return the original state if migration fails to avoid breaking the app
    return state;
  }
}
