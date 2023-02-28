import { When, Then } from '@wdio/cucumber-framework';

import SecurityPrivacyScreen from '../screen-objects/SecurityPrivacyScreen';
import LoginScreen from '../screen-objects/LoginScreen';

Then(/^on Security & Privacy screen I toggle on Remember me/, async () => {
  await SecurityPrivacyScreen.tapToskipVideo();
  await SecurityPrivacyScreen.tapRememberToggle();
  await SecurityPrivacyScreen.isRememberMeToggle('ON');
});
When(/^I toggle Remember Me on Login screen$/, async () => {
  await LoginScreen.tapRememberMeToggle();
  await LoginScreen.tapTitle();
  await LoginScreen.isRememberMeToggle('ON');
});
