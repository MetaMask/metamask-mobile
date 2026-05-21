import { test } from '../../framework/fixture';
import { System, PerformanceLogin } from '../../tags.performance.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow';
import WalletView from '../../page-objects/wallet/WalletView';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import SendView from '../../page-objects/Send/RedesignedSendView';
import FooterActions from '../../page-objects/Browser/Confirmations/FooterActions';
import ActivitiesView from '../../page-objects/Transactions/ActivitiesView';
import TestHelpers from '../../helpers.js';

const RECIPIENT_ADDRESS = '0xb1D018BE7a9cFD7AC6c5Cce00835a8F2386173d8';

/* System test: Send ETH from Account 1 to Account 2 on the same SRP */
test.describe(`${System} ${PerformanceLogin}`, () => {
  test.setTimeout(5 * 60 * 1000);

  test(
    'Send ETH from Account 1 to Account 2 on the same SRP',
    { tag: '@confirmations-team' },
    async ({ currentDeviceDetails, driver, performanceTracker }, testInfo) => {
      await loginToAppPlaywright();

      await WalletView.tapWalletSendButton();

      await SendView.selectEthereumToken();

      await SendView.enterAmountViaNumpad('0.00001');

      await SendView.pressContinueButton();

      await SendView.inputRecipientAddress(RECIPIENT_ADDRESS);

      await SendView.pressReviewButton();

      await FooterActions.tapConfirmButton();

      await TabBarComponent.tapActivity();

      await ActivitiesView.waitForTransactionConfirmed();
    },
  );
});
