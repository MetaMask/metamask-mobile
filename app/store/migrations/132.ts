import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';

import { ensureValidState } from './util';

export const migrationVersion = 132;

/**
 * Normalizes a serialized seedless vault so the mobile Encryptor always sees `cipher`.
 * Legacy vaults used browser-passworder's `data` field; mobile encryption uses `cipher`.
 */
function migrateSeedlessVaultPayload(vault: string): string {
  try {
    const payload: Record<string, unknown> = JSON.parse(vault);
    if (
      payload.data !== undefined &&
      typeof payload.data === 'string' &&
      payload.cipher === undefined
    ) {
      const { data, ...rest } = payload;
      return JSON.stringify({ ...rest, cipher: data });
    }
    return vault;
  } catch {
    return vault;
  }
}

/**
 * Migration 132: Copy seedless vault `data` → `cipher` for persisted
 * SeedlessOnboardingController state.
 */
const migration = (state: unknown): unknown => {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    if (
      !hasProperty(
        state.engine.backgroundState,
        'SeedlessOnboardingController',
      ) ||
      !isObject(state.engine.backgroundState.SeedlessOnboardingController)
    ) {
      return state;
    }

    const seedless = state.engine.backgroundState.SeedlessOnboardingController;

    if (!hasProperty(seedless, 'vault') || seedless.vault == null) {
      return state;
    }

    const { vault } = seedless;
    if (typeof vault !== 'string') {
      return state;
    }

    const migrated = migrateSeedlessVaultPayload(vault);
    if (migrated !== vault) {
      seedless.vault = migrated;
    }
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to migrate seedless vault data to cipher: ${String(
          error,
        )}`,
      ),
    );
  }

  return state;
};

export default migration;
