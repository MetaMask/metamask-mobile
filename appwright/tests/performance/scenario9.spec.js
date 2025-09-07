import { test } from '../../fixtures/performance-test.js';

import TimerHelper from '../../utils/TimersHelper.js';
import WelcomeScreen from '../../../wdio/screen-objects/Onboarding/OnboardingCarousel.js';
import TermOfUseScreen from '../../../wdio/screen-objects/Modals/TermOfUseScreen.js';
import OnboardingScreen from '../../../wdio/screen-objects/Onboarding/OnboardingScreen.js';
import CreateNewWalletScreen from '../../../wdio/screen-objects/Onboarding/CreateNewWalletScreen.js';
import MetaMetricsScreen from '../../../wdio/screen-objects/Onboarding/MetaMetricsScreen.js';
import OnboardingSucessScreen from '../../../wdio/screen-objects/OnboardingSucessScreen.js';
import OnboardingSheet from '../../../wdio/screen-objects/Onboarding/OnboardingSheet.js';
import WalletAccountModal from '../../../wdio/screen-objects/Modals/WalletAccountModal.js';
import SkipAccountSecurityModal from '../../../wdio/screen-objects/Modals/SkipAccountSecurityModal.js';
import ImportFromSeedScreen from '../../../wdio/screen-objects/Onboarding/ImportFromSeedScreen.js';
import CreatePasswordScreen from '../../../wdio/screen-objects/Onboarding/CreatePasswordScreen.js';
import WalletMainScreen from '../../../wdio/screen-objects/WalletMainScreen.js';
import AccountListComponent from '../../../wdio/screen-objects/AccountListComponent.js';
import AddAccountModal from '../../../wdio/screen-objects/Modals/AddAccountModal.js';
import TokenOverviewScreen from '../../../wdio/screen-objects/TokenOverviewScreen.js';
import { importSRPFlow, onboardingFlowImportSRP } from '../../utils/Flows.js';
import SendScreen from '../../../wdio/screen-objects/SendScreen.js';
import ConfirmationScreen from '../../../wdio/screen-objects/ConfirmationScreen.js';
import WalletActionModal from '../../../wdio/screen-objects/Modals/WalletActionModal.js';
import AmountScreen from '../../../wdio/screen-objects/AmountScreen.js';
import SendSolanaScreen from '../../../wdio/screen-objects/SendSolanaScreen.js';
import NetworkEducationModal from '../../../wdio/screen-objects/Modals/NetworkEducationModal.js';
import SolanaConfirmationScreen from '../../../wdio/screen-objects/SolanaConfirmationScreen.js';
import NetworksScreen from '../../../wdio/screen-objects/NetworksScreen.js';

test('Send flow - Ethereum, SRP 1 + SRP 2 + SRP 3', async ({
  device,
  performanceTracker,
}, testInfo) => {
  WelcomeScreen.device = device;
  TermOfUseScreen.device = device;
  OnboardingScreen.device = device;
  CreateNewWalletScreen.device = device;
  MetaMetricsScreen.device = device;
  OnboardingSucessScreen.device = device;
  OnboardingSheet.device = device;
  WalletAccountModal.device = device;
  SkipAccountSecurityModal.device = device;
  ImportFromSeedScreen.device = device;
  CreatePasswordScreen.device = device;
  WalletMainScreen.device = device;
  AccountListComponent.device = device;
  AddAccountModal.device = device;
  WalletActionModal.device = device;
  SendScreen.device = device;
  ConfirmationScreen.device = device;
  AmountScreen.device = device;
  await onboardingFlowImportSRP(device, process.env.TEST_SRP_2);
  // await importSRPFlow(device, process.env.TEST_SRP_2);
  // await importSRPFlow(device, process.env.TEST_SRP_3);

  const timer1 = new TimerHelper(
    'Time since the user clicks on the send button, until the user is in the send screen',
  );
  timer1.start();
  await WalletActionModal.tapSendButton();
  await SendScreen.isVisible();
  timer1.stop();
  performanceTracker.addTimer(timer1);

  await SendScreen.typeAddressInSendAddressField(
    '0x8aBB895C61706f33060cDb40e7a2b496C3CA1Dcf',
  );
  const timer2 = new TimerHelper(
    'Time since the user clicks on next button, until the user is in the send amount screen',
  );
  timer2.start();
  await SendScreen.tapOnNextButton();
  await SendScreen.isAmountScreenDisplayed();
  timer2.stop();
  performanceTracker.addTimer(timer2);

  const timer3 = new TimerHelper(
    'Time since the user clicks on Next after entering the amount, until the user gets the confirmation screen',
  );

  await AmountScreen.enterAmount('0.00001');
  timer3.start();
  await AmountScreen.tapOnNextButton();
  await ConfirmationScreen.isAccountSendToVisible();
  await ConfirmationScreen.isNetworkDisplayed();
  await ConfirmationScreen.isAdvancedSettingsDisplayed();
  timer3.stop();

  performanceTracker.addTimer(timer3);
  await performanceTracker.attachToTest(testInfo);
});

test('Send flow - Solana, SRP 1 + SRP 2 + SRP 3', async ({
  device,
  performanceTracker,
}, testInfo) => {
  WelcomeScreen.device = device;
  TermOfUseScreen.device = device;
  OnboardingScreen.device = device;
  CreateNewWalletScreen.device = device;
  MetaMetricsScreen.device = device;
  OnboardingSucessScreen.device = device;
  OnboardingSheet.device = device;
  WalletAccountModal.device = device;
  SkipAccountSecurityModal.device = device;
  ImportFromSeedScreen.device = device;
  CreatePasswordScreen.device = device;
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

  await onboardingFlowImportSRP(device, process.env.TEST_SRP_2);
  await importSRPFlow(device, process.env.TEST_SRP_3);
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
  performanceTracker.addTimer(timer1);

  await SendSolanaScreen.fillAddressField(
    '3xTPAZxmpwd8GrNEKApaTw6VH4jqJ31WFXUvQzgwhR7c',
  );
  await SendSolanaScreen.fillAmountField('0.001');

  const timer2 = await SendSolanaScreen.tapContinueButton();
  await SolanaConfirmationScreen.isConfirmButtonDisplayed();

  timer2.stop();
  performanceTracker.addTimer(timer2);
  await performanceTracker.attachToTest(testInfo);
});
