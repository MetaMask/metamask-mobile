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

  await login(device);
  // await onboardingFlowImportSRP(device, process.env.TEST_SRP_1, 120000);
  const destinationAddress = '0xbea21b0b30ddd5e04f426ffb0c4c79157fc4047d';
  const timer1 = new TimerHelper(
    'Time since the user clicks on the send button, until the user is in the send screen',
  );

  await WalletMainScreen.tapNetworkNavBar();
  await NetworksScreen.selectNetwork('Ethereum');
  timer1.start();
  await WalletActionModal.tapSendButton();
  await SendScreen.isVisible();
  timer1.stop();
  const timer2 = new TimerHelper(
    'Time since the user clicks on Ethereum Network, until the assets list is displayed',
  );
  timer2.start();
  await SendScreen.assetsListIsDisplayed();
  timer2.stop();
  const timer3 = new TimerHelper(
    'Time since the user clicks on ETH, until the amount screen is displayed',
  );

  await SendScreen.selectToken('Ethereum', 'ETH');
  timer3.start();
  await AmountScreen.isVisible();
  timer3.stop();
  await AmountScreen.enterAmount(TEST_AMOUNTS.ETHEREUM);
  const timer4 = new TimerHelper(
    'Time since the user clicks on next button, until the user is in the select address screen',
  );
  await AmountScreen.tapOnNextButton();
  timer4.start();
  await SendScreen.isSelectAddressScreenDisplayed();
  timer4.stop();
  const timer5 = new TimerHelper(
    'Time since the user selects the receiver account, until the user is in the review screen',
  );
  await SendScreen.typeAddressInSendAddressField(destinationAddress);
  await SendScreen.clickOnReviewButton();
  timer5.start();
  //await SendScreen.clickOnReviewButton();
  await ConfirmationScreen.isVisible(20000);
  timer5.stop();

  performanceTracker.addTimer(timer1);
  performanceTracker.addTimer(timer2);
  performanceTracker.addTimer(timer3);
  performanceTracker.addTimer(timer4);
  performanceTracker.addTimer(timer5);

  await performanceTracker.attachToTest(testInfo);
});

test('Send flow - Solana, SRP 1 + SRP 2 + SRP 3', async ({
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

  await login(device);
  // await onboardingFlowImportSRP(device, process.env.TEST_SRP_1, 120000);

  const timer1 = new TimerHelper(
    'Time since the user clicks on the send button, until the user is in the send screen',
  );
  timer1.start();
  await WalletActionModal.tapSendButton();
  await SendScreen.isVisible();
  timer1.stop();
  const timer2 = new TimerHelper(
    'Time since the user clicks on Solana Network, until the asset list is displayed',
  );

  await SendScreen.selectNetwork('Solana');
  timer2.start();
  await SendScreen.assetsListIsDisplayed();
  timer2.stop();
  const timer3 = new TimerHelper(
    'Time since the user clicks on ETH, until the amount screen is displayed',
  );
  await SendScreen.selectToken('Solana', 'SOL');

  timer3.start();
  await AmountScreen.isVisible();
  timer3.stop();
  await AmountScreen.enterAmount(TEST_AMOUNTS.SOLANA);
  const timer4 = new TimerHelper(
    'Time since the user clicks on next button, until the user is in the select address screen',
  );
  await AmountScreen.tapOnNextButton();
  timer4.start();
  await SendScreen.isSelectAddressScreenDisplayed();
  timer4.stop();
  const timer5 = new TimerHelper(
    'Time since the user selects the receiver account, until the user is in the review screen',
  );

  await SendScreen.clickOnAccountByName('Account 3');
  timer5.start();
  //await SendScreen.clickOnReviewButton();
  await ConfirmationScreen.isVisible('Solana', 20000);
  timer5.stop();

  performanceTracker.addTimer(timer1);
  performanceTracker.addTimer(timer2);
  performanceTracker.addTimer(timer3);
  performanceTracker.addTimer(timer4);
  performanceTracker.addTimer(timer5);

  await performanceTracker.attachToTest(testInfo);
});
