import { Given, When, Then } from '@wdio/cucumber-framework';
import DrawerViewScreen from '../screen-objects/DrawerViewScreen';

When(/^I tap Lock menu item/, async () => {
    await DrawerViewScreen.tapNavBarItemLock();
    await driver.pause(2000);
});

When(/^I tap Yes on alert/, async () => {
    await DrawerViewScreen.tapYesOnDeviceAlert();
    await driver.pause(2000);
});
