import { When } from '@wdio/cucumber-framework';
import EnableAutomaticSecurityChecksScreen from '../screen-objects/EnableSecurityChecksScreen';

When(/^I tap No Thanks on the Enable security check screen/, async () => {
  await EnableAutomaticSecurityChecksScreen.tapNoThanksButton();
});

// Then(/^I should no longer see the security check screen"/, async () => {
//     await EnableAutomaticSecurityChecksScreen.notVisible();
//   });
