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
import { dissmissPredictionsModal, login } from '../../../utils/Flows.js';
import TokenOverviewScreen from '../../../../wdio/screen-objects/TokenOverviewScreen.js';

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
  const timer1 = new TimerHelper(
    'Time since the user clicks on the send button, until the user is in the send screen',
    { ios: 1700, android: 1900 },
    device,
  );
  const timer2 = new TimerHelper(
    'Time since the user clicks on ETH, until the amount screen is displayed',
    { ios: 800, android: 1800 },
    device,
  );
  const timer3 = new TimerHelper(
    'Time since the user clicks on next button, until the user is in the select address screen',
    { ios: 500, android: 1000 },
    device,
  );
  const timer4 = new TimerHelper(
    'Time since the user selects the receiver account, until the user is in the review screen',
    { ios: 6500, android: 5000 },
    device,
  );
  await WalletActionModal.tapSendButton();
  await timer1.measure(() => SendScreen.assetsListIsDisplayed());

  await SendScreen.typeTokenName('Link\n');
  await SendScreen.clickOnFirstTokenBadge();
  await timer2.measure(() => AmountScreen.isVisible());

  await AmountScreen.enterAmount(TEST_AMOUNTS.ETHEREUM);
  await AmountScreen.tapOnNextButton();
  await timer3.measure(() => SendScreen.isSelectAddressScreenDisplayed());

  await SendScreen.typeAddressInSendAddressField(ethAddress);
  await SendScreen.clickOnReviewButton();
  await timer4.measure(() => ConfirmationScreen.isVisible());

  performanceTracker.addTimers(timer1, timer2, timer3, timer4);
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
  NetworksScreen.device = device;
  TokenOverviewScreen.device = device;
  await login(device);
  const timer1 = new TimerHelper(
    'Time since the user clicks on the send button, until the user is in the send screen',
    { ios: 2000, android: 1800 },
    device,
  );
  const timer2 = new TimerHelper(
    'Time since the user clicks on ETH, until the amount screen is displayed',
    { ios: 1200, android: 1700 },
    device,
  );
  const timer3 = new TimerHelper(
    'Time since the user clicks on next button, until the user is in the select address screen',
    { ios: 500, android: 1000 },
    device,
  );
  const timer4 = new TimerHelper(
    'Time since the user selects the receiver account, until the user is in the review screen',
    { ios: 6000, android: 6000 },
    device,
  );
  await WalletActionModal.tapSendButton();
  await timer1.measure(() => SendScreen.assetsListIsDisplayed());

  await SendScreen.typeTokenName('Solana\n');
  await SendScreen.clickOnFirstTokenBadge();
  await timer2.measure(() => AmountScreen.isVisible());

  await AmountScreen.enterAmount(TEST_AMOUNTS.SOLANA);

  await AmountScreen.tapOnNextButton();
  await timer3.measure(() => SendScreen.isSelectAddressScreenDisplayed());

  await SendScreen.typeAddressInSendAddressField(solanaAddress);
  await SendScreen.clickOnReviewButton();
  await timer4.measure(() => ConfirmationScreen.isVisible('Solana', 180000));

  performanceTracker.addTimers(timer1, timer2, timer3, timer4);
  await performanceTracker.attachToTest(testInfo);
});
