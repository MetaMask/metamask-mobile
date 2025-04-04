import { When } from '@wdio/cucumber-framework';
import DrawerViewScreen from '../screen-objects/DrawerViewScreen';

When(/^I tap Lock menu item/, async () => {
  await DrawerViewScreen.tapNavBarItemLock();
});

When(/^I tap Yes on alert/, async () => {
  await DrawerViewScreen.tapYesOnDeviceAlert();
});
