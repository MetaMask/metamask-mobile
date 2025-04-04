import { When } from '@wdio/cucumber-framework';
import SettingsScreen from '../screen-objects/SettingsScreen';

When(/^In settings I tap on the Lock Option$/, async () => {
  await SettingsScreen.tapLockOption();
});
