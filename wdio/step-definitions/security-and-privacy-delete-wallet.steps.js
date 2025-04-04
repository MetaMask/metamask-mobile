import { Then } from '@wdio/cucumber-framework';
import SecurityAndPrivacyScreen from '../screen-objects/SecurityAndPrivacyScreen';

Then(/^I tap on the Delete Wallet button$/, async () => {
  await SecurityAndPrivacyScreen.tapToskipVideo();
  await SecurityAndPrivacyScreen.tapDeleteWalletButton();
});
