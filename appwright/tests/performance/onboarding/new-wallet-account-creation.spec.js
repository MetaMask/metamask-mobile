import { test } from '../../../fixtures/performance-test.js';

import TimerHelper from '../../../utils/TimersHelper.js';
import WelcomeScreen from '../../../../wdio/screen-objects/Onboarding/OnboardingCarousel.js';
import TermOfUseScreen from '../../../../wdio/screen-objects/Modals/TermOfUseScreen.js';
import OnboardingScreen from '../../../../wdio/screen-objects/Onboarding/OnboardingScreen.js';
import CreateNewWalletScreen from '../../../../wdio/screen-objects/Onboarding/CreateNewWalletScreen.js';
import MetaMetricsScreen from '../../../../wdio/screen-objects/Onboarding/MetaMetricsScreen.js';
import OnboardingSucessScreen from '../../../../wdio/screen-objects/OnboardingSucessScreen.js';
import OnboardingSheet from '../../../../wdio/screen-objects/Onboarding/OnboardingSheet.js';
import WalletAccountModal from '../../../../wdio/screen-objects/Modals/WalletAccountModal.js';
import SkipAccountSecurityModal from '../../../../wdio/screen-objects/Modals/SkipAccountSecurityModal.js';
import WalletMainScreen from '../../../../wdio/screen-objects/WalletMainScreen.js';
import { getPasswordForScenario } from '../../../utils/TestConstants.js';
import AccountListComponent from '../../../../wdio/screen-objects/AccountListComponent.js';
import { dissmissPredictionsModal } from '../../../utils/Flows.js';
import CreatePasswordScreen from '../../../../wdio/screen-objects/Onboarding/CreatePasswordScreen.js';
import {
  PerformanceOnboarding,
  PerformanceAccountList,
} from '../../../tags.js';

/* Scenario 2: Account creation after fresh install */
test.describe(`${PerformanceOnboarding} ${PerformanceAccountList}`, () => {
  test(
    'Account creation after fresh install',
    { tag: '@metamask-onboarding-team' },
    async ({ device, performanceTracker }, testInfo) => {
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
      AccountListComponent.device = device;
      CreatePasswordScreen.device = device;
      await OnboardingScreen.tapCreateNewWalletButton();
      await OnboardingSheet.isVisible();

      await OnboardingSheet.tapImportSeedButton();
      await CreateNewWalletScreen.isNewAccountScreenFieldsVisible();

      await CreateNewWalletScreen.inputPasswordInFirstField(
        getPasswordForScenario('onboarding'),
      );
      await CreateNewWalletScreen.inputConfirmPasswordField(
        getPasswordForScenario('onboarding'),
      );

      await CreatePasswordScreen.tapIUnderstandCheckBox();

      await CreatePasswordScreen.tapCreatePasswordButton();

      await CreateNewWalletScreen.tapRemindMeLater();

      await MetaMetricsScreen.isScreenTitleVisible();

      await MetaMetricsScreen.tapContinueButton();
      await OnboardingSucessScreen.isVisible();

      await OnboardingSucessScreen.tapDone();

      await dissmissPredictionsModal(device);

      await WalletMainScreen.isMainWalletViewVisible();

      // await WalletMainScreen.isTokenVisible('SOL'); // TODO: skipped since locator is no longer reachable

      const screen1Timer = new TimerHelper(
        'Time since the user clicks on "Account list" button until the account list is visible',
        { ios: 1000, android: 3000 },
        device,
      );
      const screen2Timer = new TimerHelper(
        'Time since the user clicks on "Create account" button until the account is in the account list',
        { ios: 1300, android: 2000 },
        device,
      );
      const screen3Timer = new TimerHelper(
        'Time since the user clicks on new account created until the Token list is visible',
        { ios: 3000, android: 3000 },
        device,
      );

      await WalletMainScreen.tapIdenticon();
      await screen1Timer.measure(() =>
        AccountListComponent.isComponentDisplayed(),
      );

      await AccountListComponent.waitForSyncingToComplete();
      await AccountListComponent.tapCreateAccountButton();
      await screen2Timer.measure(() =>
        AccountListComponent.isAccountDisplayed('Account 2', 30000),
      );

      await AccountListComponent.tapOnAccountByName('Account 2');
      await screen3Timer.measure(async () => {
        await WalletMainScreen.checkActiveAccount('Account 2');
      });

      performanceTracker.addTimers(screen1Timer, screen2Timer, screen3Timer);
      await performanceTracker.attachToTest(testInfo);
    },
  );
});
