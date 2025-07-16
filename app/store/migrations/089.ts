import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';
import { getDefaultPreferencesState, PreferencesState } from '@metamask/preferences-controller';

interface MigrationState {
  'engine.backgroundState'?: {
    CurrencyRateController?: {
      currentCurrency?: string;
    };
    PreferencesController?: unknown;
    [key: string]: unknown;
  };
  user?: {
    currentLocale?: string;
    appTheme?: string;
    [key: string]: unknown;
  };
  settings?: {
    useBlockieIcon?: boolean;
    hideZeroBalanceTokens?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export default function migrate(state: unknown) {
  if (!isObject(state)) {
    captureException(
      new Error(
        `Migration 089: Invalid state error: '${typeof state}' received.`,
      ),
    );
    return state;
  }

  const migrationState = state as MigrationState;
  const ENGINE_BACKGROUND_STATE = 'engine.backgroundState';
  const PREFERENCES_CONTROLLER = 'PreferencesController';
  const USER_STATE = 'user';
  const SETTINGS_STATE = 'settings';

  // Get references to state sections
  const engineBackgroundState = migrationState[ENGINE_BACKGROUND_STATE];
  const userState = migrationState[USER_STATE];
  const settingsState = migrationState[SETTINGS_STATE];

  // Check if PreferencesController already exists (idempotent migration)
  if (
    engineBackgroundState &&
    hasProperty(engineBackgroundState, PREFERENCES_CONTROLLER) &&
    isObject(engineBackgroundState[PREFERENCES_CONTROLLER])
  ) {
    return state;
  }

  try {
    // Initialize PreferencesController with default state
    const defaultPreferencesState = getDefaultPreferencesState();
    const newPreferencesState = { ...defaultPreferencesState } as PreferencesState;

    // Migrate currentLocale from user state or default to 'en'
    if (
      userState &&
      hasProperty(userState, 'currentLocale') &&
      typeof userState.currentLocale === 'string'
    ) {
      newPreferencesState.currentLocale = userState.currentLocale;
    } else {
      newPreferencesState.currentLocale = 'en';
    }

    // Migrate theme from user.appTheme
    if (
      userState &&
      hasProperty(userState, 'appTheme') &&
      typeof userState.appTheme === 'string'
    ) {
      newPreferencesState.theme = userState.appTheme;
    } else {
      newPreferencesState.theme = 'light';
    }

    // Migrate useBlockie from settings.useBlockieIcon
    if (
      settingsState &&
      hasProperty(settingsState, 'useBlockieIcon') &&
      typeof settingsState.useBlockieIcon === 'boolean'
    ) {
      newPreferencesState.useBlockie = settingsState.useBlockieIcon;
    } else {
      newPreferencesState.useBlockie = false;
    }

    // Migrate currentCurrency from CurrencyRateController
    const currencyRateController = engineBackgroundState?.CurrencyRateController;
    if (
      currencyRateController &&
      hasProperty(currencyRateController, 'currentCurrency') &&
      typeof currencyRateController.currentCurrency === 'string'
    ) {
      newPreferencesState.currentCurrency = currencyRateController.currentCurrency;
    } else {
      newPreferencesState.currentCurrency = 'usd';
    }

    // Migrate hideZeroBalanceTokens from settings
    if (
      settingsState &&
      hasProperty(settingsState, 'hideZeroBalanceTokens') &&
      typeof settingsState.hideZeroBalanceTokens === 'boolean'
    ) {
      newPreferencesState.hideZeroBalanceTokens = settingsState.hideZeroBalanceTokens;
    } else {
      newPreferencesState.hideZeroBalanceTokens = false;
    }

    // Set showNativeTokenAsMainBalance to false (not implemented in mobile yet)
    newPreferencesState.showNativeTokenAsMainBalance = false;

    // Add PreferencesController to engine.backgroundState
    const newEngineBackgroundState = {
      ...engineBackgroundState,
      [PREFERENCES_CONTROLLER]: newPreferencesState,
    };

    return {
      ...state,
      [ENGINE_BACKGROUND_STATE]: newEngineBackgroundState,
    };
  } catch (error) {
    captureException(
      new Error(
        `Migration 089: Error migrating settings to PreferencesController: ${error}`,
      ),
    );
    return state;
  }
}
