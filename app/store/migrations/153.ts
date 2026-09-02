import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';
import { AuthConnection } from '../../core/OAuthService/OAuthInterface';
import { BFT_CHILD_PREFERENCES } from '../../util/basicFunctionality/bftChildPreferences';
import { computeBasicFunctionalityMigrationLandingState } from '../../util/basicFunctionality/computeBasicFunctionalityMigrationLandingState';
import { ensureValidState } from './util';

export const migrationVersion = 153;

function isSocialLoginUser(
  seedlessOnboardingController: Record<string, unknown> | undefined,
): boolean {
  if (!seedlessOnboardingController) {
    return false;
  }

  const authConnection = seedlessOnboardingController.authConnection;
  const hasAuthConnection =
    authConnection === AuthConnection.Google ||
    authConnection === AuthConnection.Apple ||
    authConnection === AuthConnection.Telegram;

  const socialBackupsMetadata =
    seedlessOnboardingController.socialBackupsMetadata;
  const hasSocialBackups =
    Array.isArray(socialBackupsMetadata) && socialBackupsMetadata.length > 0;

  return (
    hasAuthConnection ||
    hasSocialBackups ||
    seedlessOnboardingController.vault != null
  );
}

/**
 * Migration 153: Consolidate legacy Basic Functionality preferences.
 *
 * Existing users are enrolled into the consolidated Basic Functionality cohort.
 * Child preference toggles are aligned with the computed landing state.
 * Inconsistent or social-login migrations set a pending notification flag for
 * toast / modal presentation after unlock.
 *
 * @param state - The persisted Redux state.
 * @returns The migrated Redux state.
 */
export default function migrate(state: unknown): unknown {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  if (!isObject(state.settings)) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Invalid settings state: '${typeof state.settings}'`,
      ),
    );
    return state;
  }

  if (state.settings.isBasicFunctionalityConsolidatedEnabled === true) {
    return state;
  }

  const preferencesController =
    state.engine.backgroundState.PreferencesController;

  if (!isObject(preferencesController)) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Invalid PreferencesController state: '${typeof preferencesController}'`,
      ),
    );
    return state;
  }

  const seedlessOnboardingController = hasProperty(
    state.engine.backgroundState,
    'SeedlessOnboardingController',
  )
    ? (state.engine.backgroundState.SeedlessOnboardingController as
        | Record<string, unknown>
        | undefined)
    : undefined;

  const basicFunctionalityEnabled =
    state.settings.basicFunctionalityEnabled === true;

  const childPreferenceValues = Object.fromEntries(
    BFT_CHILD_PREFERENCES.map((preference) => [
      preference,
      preferencesController[preference],
    ]),
  );

  const isSocialLogin =
    !basicFunctionalityEnabled &&
    isSocialLoginUser(
      isObject(seedlessOnboardingController)
        ? seedlessOnboardingController
        : undefined,
    );

  const { landingState, shouldNotify } =
    computeBasicFunctionalityMigrationLandingState({
      basicFunctionalityEnabled,
      childPreferenceValues,
      isSocialLogin,
    });

  const updatedPreferencesController = {
    ...preferencesController,
  };

  for (const preference of BFT_CHILD_PREFERENCES) {
    updatedPreferencesController[preference] = landingState;
  }

  return {
    ...state,
    settings: {
      ...state.settings,
      basicFunctionalityEnabled: landingState,
      isBasicFunctionalityConsolidatedEnabled: true,
      basicFunctionalityMigrationNotificationPending: shouldNotify,
    },
    engine: {
      ...state.engine,
      backgroundState: {
        ...state.engine.backgroundState,
        PreferencesController: updatedPreferencesController,
      },
    },
  };
}
