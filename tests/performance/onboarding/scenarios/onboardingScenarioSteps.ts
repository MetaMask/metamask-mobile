/**
 * Code paths for the onboarding scenarios: the original specs' own Page
 * Object calls for Secret steps (SRPs, passwords, mocked OAuth), for
 * `[check: code=...]` ends and for `[if: ...]` conditions. Secrets come from
 * the environment and are never logged or shown to the model; a missing one
 * fails with its name only.
 */
import AppiumAssertions from '../../../framework/AppiumAssertions';
import AppiumGestures from '../../../framework/AppiumGestures';
import type TimerHelper from '../../../framework/TimerHelper';
import { PlatformDetector } from '../../../framework/PlatformLocator';
import { getPasswordForScenario } from '../../../framework/utils/TestConstants.js';
import OnboardingView from '../../../page-objects/Onboarding/OnboardingView';
import OnboardingSheet from '../../../page-objects/Onboarding/OnboardingSheet';
import ImportWalletView from '../../../page-objects/Onboarding/ImportWalletView';
import CreatePasswordView from '../../../page-objects/Onboarding/CreatePasswordView';
import MetaMetricsOptInView from '../../../page-objects/Onboarding/MetaMetricsOptInView';
import ProtectYourWalletView from '../../../page-objects/Onboarding/ProtectYourWalletView';
import SocialLoginView from '../../../page-objects/Onboarding/SocialLoginView';
import WalletView from '../../../page-objects/wallet/WalletView';
import LoginView from '../../../page-objects/wallet/LoginView';
import AccountListBottomSheet from '../../../page-objects/wallet/AccountListBottomSheet';
import TabBarComponent from '../../../page-objects/wallet/TabBarComponent';
import MoneyHomeView from '../../../page-objects/Money/MoneyHomeView';
import {
  closePredictModal,
  dismissMoneyOnboardingIfPresent,
  dismissOnboardingInterestQuestionnaire,
  dismissPushNotificationExistingUserSheet,
  loginToAppPlaywright,
  onboardingFlowImportSRPPlaywright,
} from '../../../flows/wallet.flow';
import { dismissProtectWalletModalIfPresent } from '../helpers/dismissProtectWalletModal';
import { measureFreshSrpPostOnboarding } from '../helpers/freshSrpPostOnboarding';
import { measureCreatePasswordToWalletHome } from '../helpers/seedlessOnboardingTimers';
import { captureOnboardingTtc } from '../helpers/captureOnboardingTtc';
import { addAppScreenTtcTimer } from '../../utils/readScreenTtc';
import { requireSecretEnv } from '../../../framework/scenario-agent/scenario';
import type { ScenarioCodeContext } from '../../login/scenarios/scenarioTest';
import type { OnboardingScreenId } from '../../../../app/hooks/performance/onboardingPerformanceIds';

type Tracker = Parameters<typeof captureOnboardingTtc>[0];
const tracker = (context: ScenarioCodeContext) =>
  context.performanceTracker as Tracker;

/** An SRP (or other secret) from the environment; fails with the name only. */
export const secretEnv = (name: string): string => requireSecretEnv(name);

/** The onboarding/import password from TestConstants; fails without echoing anything. */
export function scenarioPassword(kind: 'onboarding' | 'import'): string {
  const password = getPasswordForScenario(kind);
  if (!password)
    throw new Error(`The ${kind} password is missing from TestConstants`);
  return password;
}

const visible =
  (
    element: () => Parameters<
      typeof AppiumAssertions.expectElementToBeVisible
    >[0],
    timeout?: number,
  ) =>
  () =>
    AppiumAssertions.expectElementToBeVisible(
      element(),
      timeout ? { timeout } : {},
    );

/** `[check: code=...]` ends, each the original's own assertion. */
export const ONBOARDING_CHECKS: Record<string, () => Promise<unknown>> = {
  'onboarding-new-wallet-button': visible(() => OnboardingView.newWalletButton),
  'onboarding-new-wallet-button-60s': visible(
    () => OnboardingView.newWalletButton,
    60_000,
  ),
  'onboarding-sheet-import': visible(() => OnboardingSheet.importSeedButton),
  'import-wallet-title': visible(() => ImportWalletView.title),
  'create-password-input': visible(() => CreatePasswordView.newPasswordInput),
  'create-password-visible': () => CreatePasswordView.isVisible(),
  'metametrics-screen': visible(() => MetaMetricsOptInView.screenTitle),
  'metametrics-screen-30s': visible(
    () => MetaMetricsOptInView.screenTitle,
    30_000,
  ),
  'remind-me-later-30s': visible(
    () => ProtectYourWalletView.remindMeLaterButton,
    30_000,
  ),
  'wallet-header': visible(() => WalletView.headerRoot),
  'wallet-header-60s': visible(() => WalletView.headerRoot, 60_000),
  'wallet-container': visible(() => WalletView.container),
  'account-icon': visible(() => WalletView.accountIcon),
  'token-row-sol': visible(() => WalletView.tokenRow('SOL')),
  'tab-bar-wallet': visible(() => TabBarComponent.tabBarWalletButton),
  'tab-bar-money': visible(() => TabBarComponent.tabBarMoneyButton),
  'account-list': visible(() => AccountListBottomSheet.accountList),
  'add-wallet-button': visible(() => AccountListBottomSheet.addWalletButton),
  'account-2-in-list': visible(() =>
    AccountListBottomSheet.accountNameInList('Account 2'),
  ),
  'login-button': visible(() => LoginView.loginButton),
  'login-screen-displayed': () => LoginView.waitForScreenToDisplay(),
  'money-empty-loaded': async () => {
    await MoneyHomeView.waitForEmptyBalanceLoaded();
    await MoneyHomeView.waitForApyLoaded();
  },
  'money-empty-content': async () => {
    await MoneyHomeView.expectOnboardingCardTitleVisible();
    await MoneyHomeView.expectSendButtonEnabled();
    await MoneyHomeView.expectEarningsSectionNotVisible();
  },
  'money-funded-loaded': async () => {
    await MoneyHomeView.waitForFundedBalanceLoaded();
    await MoneyHomeView.waitForEarningsValuesLoaded();
    await MoneyHomeView.waitForApyLoaded();
  },
  'money-funded-content': async () => {
    await MoneyHomeView.expectOnboardingCardTitleVisible();
    await MoneyHomeView.expectSendButtonEnabled();
    await MoneyHomeView.expectEarningsSectionVisible();
  },
};

/** Secret steps shared by the onboarding scenarios, keyed by exact step text. */
export const ONBOARDING_STEPS: Record<
  string,
  (context: ScenarioCodeContext) => Promise<unknown>
> = {
  'Import the SRP 2 wallet in onboarding': () =>
    onboardingFlowImportSRPPlaywright(secretEnv('TEST_SRP_2')),
  'Import the SRP 3 wallet in onboarding': () =>
    onboardingFlowImportSRPPlaywright(secretEnv('TEST_SRP_3')),
  // tests/constants/money.js: MONEY_NEW_USER_SRP = TEST_SRP_1, MONEY_FUNDED_USER_SRP = TEST_SRP_3.
  'Import the Money new-user wallet in onboarding': () =>
    onboardingFlowImportSRPPlaywright(secretEnv('TEST_SRP_1')),
  'Import the Money funded-user wallet in onboarding': () =>
    onboardingFlowImportSRPPlaywright(secretEnv('TEST_SRP_3')),
  'Log in to the wallet as an onboarding user': () =>
    loginToAppPlaywright({ scenarioType: 'onboarding' }),
  'Tap I have an existing wallet on the onboarding screen': () =>
    OnboardingView.tapHaveAnExistingWallet(),
  'Enter SRP 3 and continue on the import screen': async () => {
    await ImportWalletView.typeSecretRecoveryPhrase(
      secretEnv('TEST_SRP_3'),
      true,
    );
    await AppiumGestures.hideKeyboard();
    await ImportWalletView.tapContinueButton();
  },
  'Create the import password and confirm the warning': async () => {
    const password = scenarioPassword('import');
    await CreatePasswordView.enterPassword(password);
    await CreatePasswordView.reEnterPassword(password);
    await CreatePasswordView.tapPasswordVisibilityIcon();
    await CreatePasswordView.tapConfirmPasswordVisibilityIcon();
    if (await PlatformDetector.isAndroid()) await AppiumGestures.hideKeyboard();
    await CreatePasswordView.tapCreatePasswordButton();
    await CreatePasswordView.tapPasswordWarningConfirmButton();
  },
  'Tap I agree on MetaMetrics and dismiss the questionnaire, push sheet and Predict modal':
    async () => {
      await MetaMetricsOptInView.tapIAgreeButton();
      await dismissOnboardingInterestQuestionnaire();
      await dismissPushNotificationExistingUserSheet();
      await closePredictModal();
    },
  'Create the onboarding password, confirm the warning and choose Remind me later':
    async () => {
      const password = scenarioPassword('onboarding');
      await CreatePasswordView.enterPassword(password);
      await CreatePasswordView.reEnterPassword(password);
      await AppiumGestures.hideKeyboard();
      await CreatePasswordView.tapCreatePasswordButton();
      await CreatePasswordView.tapPasswordWarningConfirmButton();
      await ProtectYourWalletView.tapRemindMeLater();
    },
  'Create the onboarding password and confirm the warning': async () => {
    const password = scenarioPassword('onboarding');
    await CreatePasswordView.enterPassword(password);
    await CreatePasswordView.reEnterPassword(password);
    await AppiumGestures.hideKeyboard();
    await CreatePasswordView.tapCreatePasswordButton();
    await CreatePasswordView.tapPasswordWarningConfirmButton();
  },
  'Tap Agree on MetaMetrics and dismiss the questionnaire, push sheet, Predict and protect-wallet modals':
    async () => {
      await MetaMetricsOptInView.tapAgreeButton();
      await dismissOnboardingInterestQuestionnaire();
      await dismissPushNotificationExistingUserSheet();
      await closePredictModal();
      await dismissProtectWalletModalIfPresent();
    },
  'Tap the account icon on the wallet': () => WalletView.tapIdenticon(),
  'Tap Add account in the account list': () =>
    AccountListBottomSheet.tapAddAccountButton(),
  'Tap Create account in the account list and dismiss the protect-wallet modal':
    async () => {
      await AccountListBottomSheet.tapCreateAccount(0);
      await dismissProtectWalletModalIfPresent(1_500);
    },
  'Tap Account 2 in the account list': () =>
    AccountListBottomSheet.tapAccountByName('Account 2'),
  'Tap the Money tab and dismiss Money onboarding if present': async () => {
    await TabBarComponent.tapMoney();
    await dismissMoneyOnboardingIfPresent();
  },
  'Tap the Money tab': () => TabBarComponent.tapMoney(),
  'Tap Remind me later on the wallet backup screen': () =>
    ProtectYourWalletView.tapRemindMeLater(),
  'Measure the post-onboarding transitions from MetaMetrics to a usable wallet':
    ({ performanceTracker, currentDeviceDetails }) =>
      measureFreshSrpPostOnboarding(
        performanceTracker as Parameters<
          typeof measureFreshSrpPostOnboarding
        >[0],
        currentDeviceDetails.platform,
      ),
  // cold-start-to-onboarding: in-app TTC for the landing screen, same
  // threshold and `required: true` as the original.
  'Record the in-app TTC for onboarding_landing': (context) =>
    addAppScreenTtcTimer({
      performanceTracker: tracker(context),
      screenId: 'onboarding_landing',
      platform: context.currentDeviceDetails.platform,
      required: true,
      threshold: { ios: 15_000, android: 1_200 },
    }),
};

export type SeedlessProvider = 'google' | 'apple' | 'telegram';

/**
 * Code paths for one seedless scenario. OAuth runs against the
 * E2E_MOCK_OAUTH seedless TestMu build (no real Google/Apple/Telegram
 * login); the scenario's [if:] branches follow which screen the post-OAuth
 * wait saw first, like the original's isNewUser.
 */
export function seedlessOptions(provider: SeedlessProvider) {
  let postOauth: 'new_user' | 'existing_user' | undefined;
  const tap = {
    google: () => OnboardingSheet.tapGoogleLoginButton(),
    apple: () => OnboardingSheet.tapAppleLoginButton(),
    telegram: () => OnboardingSheet.tapTelegramLoginButton(),
  }[provider];
  const password = () => scenarioPassword('onboarding');
  const firstOf = <T>(promises: Promise<T>[]) =>
    new Promise<T>((resolve, reject) => {
      let rejected = 0;
      promises.forEach((p) =>
        p.then(resolve).catch(() => {
          rejected += 1;
          if (rejected === promises.length)
            reject(new Error('All screen detection promises failed'));
        }),
      );
    });
  return {
    codeSteps: {
      ...ONBOARDING_STEPS,
      // seedless-telegram-onboarding.spec.ts checks this before any action.
      'Check the onboarding password credential is present': async () => {
        if (!getPasswordForScenario('onboarding')) {
          throw new Error(
            'TO-916 setup failure: onboarding password credential is missing from TestConstants',
          );
        }
      },
      'Sign in with the provider (mocked OAuth) and dismiss the update modal if present':
        async () => {
          postOauth = undefined;
          await tap();
          await SocialLoginView.dismissUpdateModalIfPresent();
        },
      'Record the post-OAuth screen TTC': (context: ScenarioCodeContext) =>
        captureOnboardingTtc(
          tracker(context),
          (postOauth === 'new_user'
            ? 'choose_pw'
            : 'account_already_exists') as OnboardingScreenId,
          context.currentDeviceDetails.platform,
        ),
      'Create the seedless wallet password': async () => {
        const pw = password();
        await CreatePasswordView.enterPassword(pw);
        await CreatePasswordView.reEnterPassword(pw);
        await AppiumGestures.hideKeyboard();
        try {
          await CreatePasswordView.ensureMarketingOptInChecked();
        } catch (error) {
          console.error('Error ensuring marketing opt-in checked:', error);
        }
        if (provider === 'apple') await AppiumGestures.hideKeyboard();
        await CreatePasswordView.tapCreatePasswordButton();
      },
      'Record the onboarding sheet TTC and dismiss the push sheet and Predict modal':
        async (context: ScenarioCodeContext) => {
          await captureOnboardingTtc(
            tracker(context),
            'onboarding_sheet',
            context.currentDeviceDetails.platform,
          );
          await dismissPushNotificationExistingUserSheet();
          await closePredictModal();
        },
      'Tap Login on the account found screen': () =>
        SocialLoginView.tapAccountFoundLoginButton(),
      'Record the rehydrate and onboarding sheet TTC': async (
        context: ScenarioCodeContext,
      ) => {
        const { platform } = context.currentDeviceDetails;
        await captureOnboardingTtc(
          tracker(context),
          'social_rehydrate',
          platform,
        );
        await captureOnboardingTtc(
          tracker(context),
          'onboarding_sheet',
          platform,
        );
      },
      'Unlock with the onboarding password': async () => {
        await LoginView.enterPassword(password());
        await LoginView.tapLoginButton();
      },
    },
    codeChecks: {
      ...ONBOARDING_CHECKS,
      'google-login-button': () =>
        AppiumAssertions.expectElementToBeVisible(
          OnboardingSheet.googleLoginButton,
          {
            description: 'Google login button should be visible',
          },
        ),
      'apple-login-button': () =>
        AppiumAssertions.expectElementToBeVisible(
          OnboardingSheet.appleLoginButton,
          {
            description: 'Apple login button should be visible',
          },
        ),
      'seedless-post-oauth': async () => {
        postOauth = await firstOf([
          CreatePasswordView.isVisible().then(() => 'new_user' as const),
          SocialLoginView.isAccountFoundScreenVisible().then(
            () => 'existing_user' as const,
          ),
        ]);
      },
      // seedless-telegram-onboarding.spec.ts assertTelegramLoginReady.
      'telegram-login-ready': async () => {
        try {
          await AppiumAssertions.expectElementToBeVisible(
            OnboardingSheet.telegramLoginButton,
            {
              description: 'Telegram login button should be visible',
            },
          );
        } catch (error) {
          throw new Error(
            `TO-916 setup failure: Telegram login button was not visible on the onboarding sheet (telegram_login_enabled and the E2E_MOCK_OAUTH without-srp build are required). Original error: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      },
    },
    timedCodeChecks: {
      'seedless-create-password-to-wallet': (timer: TimerHelper) =>
        measureCreatePasswordToWalletHome(timer),
    },
    conditions: {
      'seedless-new-user': async () => {
        if (!postOauth) throw new Error('post-OAuth screen was not resolved');
        return postOauth === 'new_user';
      },
      'seedless-existing-user': async () => {
        if (!postOauth) throw new Error('post-OAuth screen was not resolved');
        return postOauth === 'existing_user';
      },
    },
  };
}
