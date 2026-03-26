import { test } from '../../../framework/fixture';
import WelcomeScreen from '../../../../wdio/screen-objects/Onboarding/OnboardingCarousel.js';
import TermOfUseScreen from '../../../../wdio/screen-objects/Modals/TermOfUseScreen.js';
import OnboardingScreen from '../../../../wdio/screen-objects/Onboarding/OnboardingScreen.js';
import CreateNewWalletScreen from '../../../../wdio/screen-objects/Onboarding/CreateNewWalletScreen.js';
import MetaMetricsScreen from '../../../../wdio/screen-objects/Onboarding/MetaMetricsScreen.js';
import OnboardingSucessScreen from '../../../../wdio/screen-objects/OnboardingSucessScreen.js';
import OnboardingSheet from '../../../../wdio/screen-objects/Onboarding/OnboardingSheet.js';
import WalletAccountModal from '../../../../wdio/screen-objects/Modals/WalletAccountModal.js';
import SkipAccountSecurityModal from '../../../../wdio/screen-objects/Modals/SkipAccountSecurityModal.js';
import ImportFromSeedScreen from '../../../../wdio/screen-objects/Onboarding/ImportFromSeedScreen.js';
import CreatePasswordScreen from '../../../../wdio/screen-objects/Onboarding/CreatePasswordScreen.js';
import WalletMainScreen from '../../../../wdio/screen-objects/WalletMainScreen.js';
import AccountListComponent from '../../../../wdio/screen-objects/AccountListComponent.js';
import AddAccountModal from '../../../../wdio/screen-objects/Modals/AddAccountModal.js';
import {
  login,
  onboardingFlowImportSRP,
} from '../../../framework/utils/Flows.js';
import ConfirmationScreen from '../../../../wdio/screen-objects/ConfirmationScreen.js';
import WalletActionModal from '../../../../wdio/screen-objects/Modals/WalletActionModal.js';
import AmountScreen from '../../../../wdio/screen-objects/AmountScreen.js';
import MultichainAccountEducationModal from '../../../../wdio/screen-objects/Modals/MultichainAccountEducationModal.js';
import AppwrightGestures from '../../../framework/AppwrightGestures.js';
import LoginScreen from '../../../../wdio/screen-objects/LoginScreen.js';
import {
  PerformanceOnboarding,
  PerformanceLaunch,
} from '../../../tags.performance.js';
import PlaywrightGestures from '../../../framework/PlaywrightGestures';

test.describe(`${PerformanceOnboarding} ${PerformanceLaunch}`, () => {
  test(
    'Cold Start after importing a wallet',
    { tag: '@metamask-mobile-platform' },
    async ({ currentDeviceDetails, driver, performanceTracker }, testInfo) => {
      await onboardingFlowImportSRP(device, process.env.TEST_SRP_3);
      await PlaywrightGestures.terminateApp();
      await AppwrightGestures.activateApp(device);
      await LoginScreen.waitForScreenToDisplay();
      await login(device, {
        scenarioType: 'onboarding',
        skipIntro: true,
      }); // Skip intro screens on second login

      const timer1 = await WalletMainScreen.isMenuButtonVisible();
      timer1.changeName(
        'Time since the user clicks on unlock button, until the app unlocks',
        { ios: 2000, android: 2000 },
        device,
      );

      performanceTracker.addTimer(timer1);
      await performanceTracker.attachToTest(testInfo);
    },
  );
});
