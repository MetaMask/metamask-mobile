import Engine from '../../core/Engine';
import { AppThemeKey } from '../../util/theme/models';

/**
 * Updates the theme setting in PreferencesController
 */
export const updateTheme = (theme: AppThemeKey) => {
  const { PreferencesController } = Engine.context;
  PreferencesController.setTheme(theme);
};

/**
 * Updates the useBlockie setting in PreferencesController
 */
export const updateUseBlockie = (useBlockie: boolean) => {
  const { PreferencesController } = Engine.context;
  PreferencesController.setUseBlockie(useBlockie);
};

/**
 * Updates the currentCurrency setting in PreferencesController
 */
export const updateCurrentCurrency = (currentCurrency: string) => {
  const { PreferencesController } = Engine.context;
  PreferencesController.setCurrentCurrency(currentCurrency);
};

/**
 * Updates the hideZeroBalanceTokens setting in PreferencesController
 */
export const updateHideZeroBalanceTokens = (hideZeroBalanceTokens: boolean) => {
  const { PreferencesController } = Engine.context;
  PreferencesController.setHideZeroBalanceTokens(hideZeroBalanceTokens);
};

/**
 * Updates the showNativeTokenAsMainBalance setting in PreferencesController
 */
export const updateShowNativeTokenAsMainBalance = (showNativeTokenAsMainBalance: boolean) => {
  const { PreferencesController } = Engine.context;
  PreferencesController.setShowNativeTokenAsMainBalance(showNativeTokenAsMainBalance);
};

/**
 * Updates the currentLocale setting in PreferencesController
 */
export const updateCurrentLocale = (currentLocale: string) => {
  const { PreferencesController } = Engine.context;
  PreferencesController.setCurrentLocale(currentLocale);
};
