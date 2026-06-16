import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';

/**
 * Migration 144: Replace the legacy single-slot WalletConnect metadata
 * (`state.sdk.wc2Metadata`) with a per-connection map
 * (`state.sdk.wc2SessionMetadata`) keyed by pairing topic.
 *
 * Drops `state.sdk.wc2Metadata` if present (it was an ephemeral proposal-time
 * slot; carrying a stale value forward causes false WalletConnect detection
 * in `useOriginSource` and dapp display logic). Initializes
 * `state.sdk.wc2SessionMetadata` to an empty object if it does not already
 * exist. Active WalletConnect sessions repopulate it organically on the next
 * proposal / RPC request.
 *
 * Idempotent: running twice is a no-op once the legacy field is gone and the
 * new field exists.
 *
 * @param state - The persisted Redux state.
 * @returns The migrated state.
 */
const migration = (state: unknown): unknown => {
  const migrationVersion = 144;

  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  if (!hasProperty(state, 'sdk')) {
    captureException(
      new Error(`Migration ${migrationVersion}: Missing sdk state slice`),
    );
    return state;
  }

  if (!isObject(state.sdk)) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Invalid sdk state error: '${JSON.stringify(
          state.sdk,
        )}'`,
      ),
    );
    return state;
  }

  const sdk = state.sdk as Record<string, unknown>;

  if (hasProperty(sdk, 'wc2Metadata')) {
    delete sdk.wc2Metadata;
  }

  if (
    !hasProperty(sdk, 'wc2SessionMetadata') ||
    !isObject(sdk.wc2SessionMetadata)
  ) {
    sdk.wc2SessionMetadata = {};
  }

  return state;
};

export default migration;
