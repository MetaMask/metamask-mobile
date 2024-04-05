import { Then, When } from '@wdio/cucumber-framework';

import SecurityAndPrivacyScreen from '../screen-objects/SecurityAndPrivacyScreen';
import LoginScreen from '../screen-objects/LoginScreen';

Then(/^on Security & Privacy screen I toggle on Remember me/, async () => {
  await SecurityAndPrivacyScreen.tapToskipVideo();
  await SecurityAndPrivacyScreen.tapRememberToggle();
  await driver.pause(2000);
  //await SecurityAndPrivacyScreen.isRememberMeToggle('ON');
});

When(/^I toggle Remember Me on Login screen$/, async () => {
  await LoginScreen.tapRememberMeToggle();
  await LoginScreen.tapTitle();
  //await LoginScreen.isRememberMeToggle('ON');
});
