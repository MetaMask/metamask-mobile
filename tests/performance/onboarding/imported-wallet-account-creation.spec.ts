import { test } from '../../framework/fixture';
import {
  PerformanceOnboarding,
  PerformanceAccountList,
} from '../../tags.performance.js';
import WalletView from '../../page-objects/wallet/WalletView';
import AccountListBottomSheet from '../../page-objects/wallet/AccountListBottomSheet';
import { asPlaywrightElement, PlaywrightAssertions } from '../../framework';
import TimerHelper from '../../framework/TimerHelper';
import { onboardingFlowImportSRPPlaywright } from '../../flows/wallet.flow';

/* Scenario 1: Imported wallet with 50+ accounts + account creation */
test.describe(`${PerformanceOnboarding} ${PerformanceAccountList}`, () => {
  test.skip(
    'Account creation with 50+ accounts, SRP 1 + SRP 2 + SRP 3',
    { tag: '@metamask-onboarding-team' },
    async ({ currentDeviceDetails, driver, performanceTracker }, testInfo) => {
      await onboardingFlowImportSRPPlaywright(process.env.TEST_SRP_2 ?? '');

      const screen1Timer = new TimerHelper(
        'Time since the user clicks on "Account list" button until the account list is visible',
      );

      const screen3Timer = new TimerHelper(
        'Time since the user clicks on new account created until the Token list is visible',
      );

      await WalletView.tapIdenticon();
      await screen1Timer.measure(
        async () =>
          await PlaywrightAssertions.expectElementToBeVisible(
            await asPlaywrightElement(AccountListBottomSheet.accountList),
          ),
      );

      await AccountListBottomSheet.tapAddAccountButton();
      await screen3Timer.measure(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          await asPlaywrightElement(WalletView.tokenRow('SOL')),
        );
      });

      performanceTracker.addTimers(screen1Timer, screen3Timer);
    },
  );
});
