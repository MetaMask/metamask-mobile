import { When } from '@wdio/cucumber-framework';
import ConnectedAccountsModal from '../screen-objects/Modals/ConnectedAccountsModal';
import CommonScreen from '../screen-objects/CommonScreen';

When(/^I tap on Revoke button$/, async () => {
  await ConnectedAccountsModal.tapDisconnectAllButton();
  await CommonScreen.waitForToastToDisplay();
  await CommonScreen.waitForToastToDisappear();
});
