import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import { captureException } from '@sentry/react-native';

/**
 * Migration 71: set completedOnboarding based on the state of the KeyringController.
 */
const migration = (state: unknown): unknown => {
  const migrationVersion = 71;

  // Ensure the state is valid for migration
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    const KeyringController = state.engine.backgroundState.KeyringController;

    if (
      KeyringController &&
      hasProperty(KeyringController, 'vault') &&
      hasProperty(state, 'onboarding') &&
      isObject(state.onboarding)
    ) {
      const { vault } = KeyringController;
      state.onboarding.completedOnboarding = Boolean(vault);
    }

    return state;
  } catch (error) {
    captureException(
      new Error(
        `Migration 071: setting completedOnboarding failed with error: ${error}`,
      ),
    );
    return state;
  }
};

export default migration;
