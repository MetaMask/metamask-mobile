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
import GTMModal from '../../../../wdio/screen-objects/Modals/GTMModal.js';
import AccountListComponent from '../../../../wdio/screen-objects/AccountListComponent.js';

test('Account creation after fresh install', async ({
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
  WalletMainScreen.device = device;
  GTMModal.device = device;
  AccountListComponent.device = device;

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

  await CreateNewWalletScreen.tapSubmitButton();
  await CreateNewWalletScreen.tapRemindMeLater();
  await SkipAccountSecurityModal.isVisible();

  await SkipAccountSecurityModal.proceedWithoutWalletSecure();
  await MetaMetricsScreen.isScreenTitleVisible();

  await MetaMetricsScreen.tapIAgreeButton();
  await OnboardingSucessScreen.isVisible();

  await OnboardingSucessScreen.tapDone();
  await GTMModal.isVisible();

  await GTMModal.tapNotNow();

  await WalletMainScreen.isMainWalletViewVisible();

  await WalletMainScreen.isTokenVisible('SOL');

  const screen1Timer = new TimerHelper(
    'Time since the user clicks on "Account list" button until the account list is visible',
  );
  const screen2Timer = new TimerHelper(
    'Time since the user clicks on "Create account" button until the account is in the account list',
  );
  const screen3Timer = new TimerHelper(
    'Time since the user clicks on new account created until the Token list is visible',
  );
  screen1Timer.start();
  await WalletMainScreen.tapIdenticon();
  await AccountListComponent.isComponentDisplayed();
  screen1Timer.stop();

  await AccountListComponent.tapCreateAccountButton();
  screen2Timer.start();
  await AccountListComponent.isAccountDisplayed('Account 2');
  screen2Timer.stop();
  await AccountListComponent.tapOnAccountByName('Account 2');

  screen3Timer.start();
  await WalletMainScreen.isMainWalletViewVisible();
  await WalletMainScreen.isTokenVisible('SOL');
  screen3Timer.stop();
  performanceTracker.addTimer(screen1Timer);
  performanceTracker.addTimer(screen2Timer);
  performanceTracker.addTimer(screen3Timer);
  await performanceTracker.attachToTest(testInfo);
});
