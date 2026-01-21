import { loginToApp } from '../../../../tests/page-objects/viewHelper.ts';
import TabBarComponent from '../../../../tests/page-objects/wallet/TabBarComponent';
import SettingsView from '../../../../tests/page-objects/Settings/SettingsView';
import DeveloperOptionsView from '../../../../tests/page-objects/Settings/DeveloperOptions/DeveloperOptionsView';

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
