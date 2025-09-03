import { test } from 'appwright';

import TimerHelper from '../../utils/TimersHelper.js';
import { PerformanceTracker } from '../../reporters/PerformanceTracker.js';
import WelcomeScreen from '../../../wdio/screen-objects/Onboarding/OnboardingCarousel.js';
import TermOfUseScreen from '../../../wdio/screen-objects/Modals/TermOfUseScreen.js';
import OnboardingScreen from '../../../wdio/screen-objects/Onboarding/OnboardingScreen.js';
import CreateNewWalletScreen from '../../../wdio/screen-objects/Onboarding/CreateNewWalletScreen.js';
import MetaMetricsScreen from '../../../wdio/screen-objects/Onboarding/MetaMetricsScreen.js';
import OnboardingSucessScreen from '../../../wdio/screen-objects/OnboardingSucessScreen.js';
import OnboardingSheet from '../../../wdio/screen-objects/Onboarding/OnboardingSheet.js';
import WalletAccountModal from '../../../wdio/screen-objects/Modals/WalletAccountModal.js';
import SkipAccountSecurityModal from '../../../wdio/screen-objects/Modals/SkipAccountSecurityModal.js';
import WalletMainScreen from '../../../wdio/screen-objects/WalletMainScreen.js';
import CreatePasswordScreen from '../../../wdio/screen-objects/Onboarding/CreatePasswordScreen.js';
import ImportFromSeedScreen from '../../../wdio/screen-objects/Onboarding/ImportFromSeedScreen.js';
import { importSRPFlow, onboardingFlowImportSRP } from '../../utils/Flows.js';

test('Import SRP with +50 accounts, SRP 1, SRP 2, SRP 3', async ({
  device,
  performanceTracker,
}, testInfo) => {
  const screen1Timer = new TimerHelper(
    'Time until the user clicks on the "Get Started" button',
  );
  screen1Timer.start();
  WelcomeScreen.device = device;
  TermOfUseScreen.device = device;
  OnboardingScreen.device = device;
  CreateNewWalletScreen.device = device;
  MetaMetricsScreen.device = device;
  OnboardingSucessScreen.device = device;
  OnboardingSheet.device = device;
  WalletAccountModal.device = device;
  SkipAccountSecurityModal.device = device;
  WalletMainScreen.device = device;
  ImportFromSeedScreen.device = device;
  CreatePasswordScreen.device = device;

  await onboardingFlowImportSRP(device, process.env.TEST_SRP_1);
  await importSRPFlow(device, process.env.TEST_SRP_2);
  await WalletMainScreen.isTokenVisible('Ethereum');
  const timers = await importSRPFlow(device, process.env.TEST_SRP_3);
  await WalletMainScreen.isTokenVisible('Ethereum');

  await WalletMainScreen.tapIdenticon();
  timers.forEach((timer) => performanceTracker.addTimer(timer));
  await performanceTracker.attachToTest(testInfo);
});
