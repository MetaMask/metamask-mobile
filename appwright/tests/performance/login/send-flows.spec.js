import { test } from '../../../fixtures/performance-test.js';

import TimerHelper from '../../../utils/TimersHelper.js';
import WalletAccountModal from '../../../../wdio/screen-objects/Modals/WalletAccountModal.js';
import WalletMainScreen from '../../../../wdio/screen-objects/WalletMainScreen.js';
import AccountListComponent from '../../../../wdio/screen-objects/AccountListComponent.js';
import AddAccountModal from '../../../../wdio/screen-objects/Modals/AddAccountModal.js';
import SendScreen from '../../../../wdio/screen-objects/SendScreen.js';
import ConfirmationScreen from '../../../../wdio/screen-objects/ConfirmationScreen.js';
import WalletActionModal from '../../../../wdio/screen-objects/Modals/WalletActionModal.js';
import AmountScreen from '../../../../wdio/screen-objects/AmountScreen.js';
import NetworksScreen from '../../../../wdio/screen-objects/NetworksScreen.js';
import LoginScreen from '../../../../wdio/screen-objects/LoginScreen.js';

import { TEST_AMOUNTS } from '../../../utils/TestConstants.js';
import { login } from '../../../utils/Flows.js';
import TokenOverviewScreen from 'wdio/screen-objects/TokenOverviewScreen.js';

const ethAddress = '0xbea21b0b30ddd5e04f426ffb0c4c79157fc4047d';
const solanaAddress = 'HoR1MS7B5TsFzDV6cuJwoHTg1N6mTRAzmgprTpCNGS4x';
/* Scenario 9: Send flow - Ethereum, SRP 1 + SRP 2 + SRP 3 */
test('Send flow - Ethereum, SRP 1 + SRP 2 + SRP 3', async ({
  device,
  performanceTracker,
}, testInfo) => {
  WalletAccountModal.device = device;
  WalletMainScreen.device = device;
  AccountListComponent.device = device;
  AddAccountModal.device = device;
  WalletActionModal.device = device;
  SendScreen.device = device;
  ConfirmationScreen.device = device;
  AmountScreen.device = device;
  LoginScreen.device = device;
  NetworksScreen.device = device;
  TokenOverviewScreen.device = device;
  await login(device);
  // await onboardingFlowImportSRP(device, process.env.TEST_SRP_1, 120000);
  const timer1 = new TimerHelper(
    'Time since the user clicks on the send button, until the user is in the send screen',
  );
  const timer2 = new TimerHelper(
    'Time since the user clicks on ETH, until the amount screen is displayed',
  );
  const timer3 = new TimerHelper(
    'Time since the user clicks on next button, until the user is in the select address screen',
  );
  const timer4 = new TimerHelper(
    'Time since the user selects the receiver account, until the user is in the review screen',
  );
  await WalletActionModal.tapSendButton();
  timer1.start();
  await SendScreen.assetsListIsDisplayed();
  timer1.stop();
  await SendScreen.typeTokenName('Ethereum\n');
  console.log('Ethereum typed, so waiting 5 seconds');
  await SendScreen.clickOnFirstTokenBadge();
  timer2.start();

  await AmountScreen.isVisible();
  timer2.stop();
  await AmountScreen.enterAmount(TEST_AMOUNTS.ETHEREUM);


  await AmountScreen.tapOnNextButton();
  timer3.start();
  await SendScreen.isSelectAddressScreenDisplayed();
  timer3.stop();
  await SendScreen.typeAddressInSendAddressField(destinationAddress);
  await SendScreen.clickOnReviewButton();
  timer4.start();
  await ConfirmationScreen.isVisible();
  timer4.stop();



  performanceTracker.addTimer(timer1);
  performanceTracker.addTimer(timer2);
  performanceTracker.addTimer(timer3);
  performanceTracker.addTimer(timer4);

  await performanceTracker.attachToTest(testInfo);
});

test.only('Send flow - Solana, SRP 1 + SRP 2 + SRP 3', async ({
  device,
  performanceTracker,
}, testInfo) => {
  WalletAccountModal.device = device;
  WalletMainScreen.device = device;
  AccountListComponent.device = device;
  AddAccountModal.device = device;
  WalletActionModal.device = device;
  SendScreen.device = device;
  ConfirmationScreen.device = device;
  AmountScreen.device = device;
  LoginScreen.device = device;
  NetworksScreen.device = device;
  TokenOverviewScreen.device = device;
  await login(device);
  // await onboardingFlowImportSRP(device, process.env.TEST_SRP_1, 120000);
  const timer1 = new TimerHelper(
    'Time since the user clicks on the send button, until the user is in the send screen',
  );
  const timer2 = new TimerHelper(
    'Time since the user clicks on ETH, until the amount screen is displayed',
  );
  const timer3 = new TimerHelper(
    'Time since the user clicks on next button, until the user is in the select address screen',
  );
  const timer4 = new TimerHelper(
    'Time since the user selects the receiver account, until the user is in the review screen',
  );
  await device.pause(1000000000);
  await WalletActionModal.tapSendButton();
  timer1.start();
  await SendScreen.assetsListIsDisplayed();
  timer1.stop();
  await SendScreen.typeTokenName('Solana\n');
  console.log('Solana typed, so waiting 5 seconds');
  await SendScreen.clickOnFirstTokenBadge();
  timer2.start();

  await AmountScreen.isVisible();
  timer2.stop();
  await AmountScreen.enterAmount(TEST_AMOUNTS.SOLANA);


  await AmountScreen.tapOnNextButton();
  timer3.start();
  await SendScreen.isSelectAddressScreenDisplayed();
  timer3.stop();
  await SendScreen.typeAddressInSendAddressField(solanaAddress);
  await SendScreen.clickOnReviewButton();
  timer4.start();
  await ConfirmationScreen.isVisible();
  timer4.stop();



  performanceTracker.addTimer(timer1);
  performanceTracker.addTimer(timer2);
  performanceTracker.addTimer(timer3);
  performanceTracker.addTimer(timer4);

  await performanceTracker.attachToTest(testInfo);
});
