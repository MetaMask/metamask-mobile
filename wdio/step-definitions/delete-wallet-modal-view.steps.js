import { When } from '@wdio/cucumber-framework';
import DeleteWalletModal from '../screen-objects/Modals/DeleteWalletModal';

When(/^I tap I understand, continue on Delete wallet modal/, async () => {
  await DeleteWalletModal.tapIUnderstandContinue();
});

When(/^I type "([^"]*)?" on Delete wallet modal permanently/, async (text) => {
  await DeleteWalletModal.typeTextDelete(text);
});

When(/^I tap Delete my wallet on Delete wallet modal permanently/, async () => {
  await DeleteWalletModal.tapDeleteMyWallet();
});
