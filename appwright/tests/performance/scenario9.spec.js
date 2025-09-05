import { test } from '../../fixtures/performance-test.js';

import TimerHelper from '../../utils/TimersHelper.js';
import { PerformanceTracker } from '../../reporters/PerformanceTracker.js';
import WalletAccountModal from '../../../wdio/screen-objects/Modals/WalletAccountModal.js';
import WalletMainScreen from '../../../wdio/screen-objects/WalletMainScreen.js';
import AccountListComponent from '../../../wdio/screen-objects/AccountListComponent.js';
import AddAccountModal from '../../../wdio/screen-objects/Modals/AddAccountModal.js';
import SendScreen from '../../../wdio/screen-objects/SendScreen.js';
import ConfirmationScreen from '../../../wdio/screen-objects/ConfirmationScreen.js';
import WalletActionModal from '../../../wdio/screen-objects/Modals/WalletActionModal.js';
import AmountScreen from '../../../wdio/screen-objects/AmountScreen.js';
import SendSolanaScreen from '../../../wdio/screen-objects/SendSolanaScreen.js';
import NetworkEducationModal from '../../../wdio/screen-objects/Modals/NetworkEducationModal.js';
import SolanaConfirmationScreen from '../../../wdio/screen-objects/SolanaConfirmationScreen.js';
import NetworksScreen from '../../../wdio/screen-objects/NetworksScreen.js';
import LoginScreen from '../../../wdio/screen-objects/LoginScreen.js';

import { importSRPFlow , login } from '../../utils/Flows.js';
import { TEST_ADDRESSES, TEST_AMOUNTS } from '../../utils/TestConstants.js';

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

  await login(device, 'send');
  // await importSRPFlow(device, process.env.TEST_SRP_3);

  const timer1 = new TimerHelper(
    'Time since the user clicks on the send button, until the user is in the send screen',
  );
  timer1.start();
  await WalletActionModal.tapSendButton();
  await SendScreen.isVisible();
  timer1.stop();
  await SendScreen.typeAddressInSendAddressField(TEST_ADDRESSES.ETHEREUM);
  const timer2 = new TimerHelper(
    'Time since the user clicks on next button, until the user is in the send amount screen',
  );
  timer2.start();
  await SendScreen.tapOnNextButton();
  await SendScreen.isAmountScreenDisplayed();
  timer2.stop();
  const timer3 = new TimerHelper(
    'Time since the user clicks on Next after entering the amount, until the user gets the confirmation screen',
  );

  await AmountScreen.enterAmount(TEST_AMOUNTS.ETHEREUM);
  timer3.start();
  await AmountScreen.tapOnNextButton();
  await ConfirmationScreen.isAccountSendToVisible();
  await ConfirmationScreen.isNetworkDisplayed();
  await ConfirmationScreen.isAdvancedSettingsDisplayed();
  timer3.stop();

  performanceTracker.addTimer(timer1);
  performanceTracker.addTimer(timer2);
  performanceTracker.addTimer(timer3);
  await performanceTracker.attachToTest(testInfo);
});

test('Send flow - Solana, SRP 1 + SRP 2 + SRP 3', async ({
  device,
  performanceTracker,
}, testInfo) => {
  WalletMainScreen.device = device;
  AccountListComponent.device = device;
  AddAccountModal.device = device;
  WalletActionModal.device = device;
  SendScreen.device = device;
  ConfirmationScreen.device = device;
  AmountScreen.device = device;
  NetworkEducationModal.device = device;
  SendSolanaScreen.device = device;
  SolanaConfirmationScreen.device = device;
  NetworksScreen.device = device;
  LoginScreen.device = device;

  await login(device, 'send');
  // await importSRPFlow(device, process.env.TEST_SRP_2);
  // await importSRPFlow(device, process.env.TEST_SRP_3);

  await WalletMainScreen.tapIdenticon();
  await AccountListComponent.isComponentDisplayed();

  await AccountListComponent.tapOnAccountByName('Solana');
  await NetworkEducationModal.tapGotItButton();

  const timer1 = new TimerHelper(
    'Time since the user clicks on the send button, until the user is in the send screen',
  );
  timer1.start();
  await WalletActionModal.tapSendButton();
  await SendSolanaScreen.isAddressFieldVisible();
  timer1.stop();

  await SendSolanaScreen.fillAddressField(TEST_ADDRESSES.SOLANA);
  await SendSolanaScreen.fillAmountField(TEST_AMOUNTS.SOLANA);

  const timer2 = await SendSolanaScreen.tapContinueButton();
  await SolanaConfirmationScreen.isConfirmButtonDisplayed();

  timer2.stop();
  performanceTracker.addTimer(timer1);
  performanceTracker.addTimer(timer2);
  await performanceTracker.attachToTest(testInfo);
});
