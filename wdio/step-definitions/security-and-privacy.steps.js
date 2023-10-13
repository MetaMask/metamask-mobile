import { When } from '@wdio/cucumber-framework';
import NetworksScreen from '../screen-objects/NetworksScreen';
import SecurityAndPrivacyScreen from '../screen-objects/SecurityAndPrivacyScreen';

When(/^on Security & Privacy screen I tap "([^"]*)?"/, async (text) => {
  const timeout = 1000;
  await driver.pause(timeout);
  switch (text) {
    case 'Change password':
      await SecurityAndPrivacyScreen.tapChangePassword();
      break;
    default:
      break;
  }
});
When(/^I navigate to Wallet view from Security & Privacy/, async () => {
  await NetworksScreen.tapBackButtonInNewScreen();
  await NetworksScreen.tapBackButtonInNewScreen();
  await NetworksScreen.tapBackButtonInSettingsScreen();
});
