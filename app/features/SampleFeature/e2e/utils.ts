import { loginToApp } from '../../../../e2e/viewHelper';
import TabBarComponent from '../../../../e2e/pages/wallet/TabBarComponent';
import SettingsView from '../../../../e2e/pages/Settings/SettingsView';
import DeveloperOptionsView from '../../../../e2e/pages/Settings/DeveloperOptions/DeveloperOptionsView';

export const navigateToSampleFeature = async () => {
  // Login to app with password
  await loginToApp();
  // Navigate to Settings
  await TabBarComponent.tapSettings();

  // Scroll to and tap Developer Options
  await SettingsView.scrollToDeveloperOptions();
  await SettingsView.tapDeveloperOptions();

  // Tap on Sample Feature
  await DeveloperOptionsView.tapSampleFeature();
};
