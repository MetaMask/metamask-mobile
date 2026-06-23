import { hasProperty, isObject } from '@metamask/utils';

import { ensureValidState } from './util';
import { migrateSeedlessVaultCipherFormat } from './util/migrateSeedlessVaultCipherFormat';

export const migrationVersion = 144;

/**
 * Migration 144:
 *
 * Rewrites SeedlessOnboardingController vaults that use the legacy `data`
 * encrypted-payload field (browser-passworder shape) to include the mobile-
 * canonical `cipher` field. KeyringController vaults are not affected.
 *
 * @param state - The persisted Redux state.
 * @returns The migrated state.
 */
const migration = (state: unknown): unknown => {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  const { backgroundState } = state.engine;

  if (
    !hasProperty(backgroundState, 'SeedlessOnboardingController') ||
    !isObject(backgroundState.SeedlessOnboardingController)
  ) {
    return state;
  }

  const seedlessController = backgroundState.SeedlessOnboardingController;

  if (!hasProperty(seedlessController, 'vault')) {
    return state;
  }

  const { vault, migrated } = migrateSeedlessVaultCipherFormat(
    seedlessController.vault,
  );

  if (migrated) {
    seedlessController.vault = vault;
  }

  return state;
};

export default migration;
