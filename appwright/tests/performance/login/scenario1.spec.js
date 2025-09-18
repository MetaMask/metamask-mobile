import { test } from '../../../fixtures/performance-test.js';

import LoginScreen from '../../../../wdio/screen-objects/LoginScreen.js';
import TimerHelper from '../../../utils/TimersHelper.js';
import WalletMainScreen from '../../../../wdio/screen-objects/WalletMainScreen.js';

import AccountListComponent from '../../../../wdio/screen-objects/AccountListComponent.js';
import AddAccountModal from '../../../../wdio/screen-objects/Modals/AddAccountModal.js';
import WalletActionModal from '../../../../wdio/screen-objects/Modals/WalletActionModal.js';
import TabBarModal from '../../../../wdio/screen-objects/Modals/TabBarModal.js';
import { login } from '../../../utils/Flows.js';
import AddNewHdAccountComponent from '../../../../wdio/screen-objects/Modals/AddNewHdAccountComponent.js';

test('Account creation with 50+ accounts, SRP 1 + SRP 2 + SRP 3', async ({
  device,
  performanceTracker,
}, testInfo) => {
  LoginScreen.device = device;
  WalletMainScreen.device = device;
  AccountListComponent.device = device;
  AddAccountModal.device = device;
  WalletActionModal.device = device;
  TabBarModal.device = device;
  WalletMainScreen.device = device;
  AccountListComponent.device = device;
  AddAccountModal.device = device;
  AddNewHdAccountComponent.device = device;

  await login(device, 'login');

  // await importSRPFlow(device, process.env.TEST_SRP_2);
  // await importSRPFlow(device, process.env.TEST_SRP_3);

  const screen1Timer = new TimerHelper(
    'Time since the user clicks on "Account list" button until the account list is visible',
  );
  const screen2Timer = new TimerHelper(
    'Time since the user clicks on "Create account" button until the account is in the account list',
  );
  const screen3Timer = new TimerHelper(
    'Time since the user clicks on new account created until the Token list is visible',
  );

  await WalletMainScreen.isTokenVisible('Ethereum');
  screen1Timer.start();
  await WalletMainScreen.tapIdenticon();
  await AccountListComponent.isComponentDisplayed();
  screen1Timer.stop();
  screen2Timer.start();
  await AccountListComponent.tapCreateAccountButton();
  screen2Timer.stop();
  await AccountListComponent.tapOnAccountByName('Account 4');

  screen3Timer.start();
  await WalletMainScreen.isTokenVisible('Ethereum');
  screen3Timer.stop();

  performanceTracker.addTimer(screen1Timer);
  performanceTracker.addTimer(screen2Timer);
  performanceTracker.addTimer(screen3Timer);

  await performanceTracker.attachToTest(testInfo);
});
