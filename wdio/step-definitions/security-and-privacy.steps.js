import { When, Then } from '@wdio/cucumber-framework';
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
