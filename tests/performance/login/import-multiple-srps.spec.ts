import { test as perfTest } from '../../framework/fixture';
import TimerHelper from '../../framework/TimerHelper';
import { asPlaywrightElement, PlaywrightAssertions } from '../../framework';
import { loginToAppPlaywright } from '../../flows/wallet.flow';
import ImportWalletView from '../../page-objects/Onboarding/ImportWalletView';
import AddAccountBottomSheet from '../../page-objects/wallet/AddAccountBottomSheet';
import AccountListBottomSheet from '../../page-objects/wallet/AccountListBottomSheet';
import WalletView from '../../page-objects/wallet/WalletView';
import {
  PerformanceAccountList,
  PerformanceLogin,
} from '../../tags.performance.js';
import PlaywrightGestures from '../../framework/PlaywrightGestures';
/* Scenario 4: Import SRP with +50 accounts, SRP 1, SRP 2, SRP 3 */
perfTest.describe(`${PerformanceLogin} ${PerformanceAccountList}`, () => {
  perfTest.setTimeout(30 * 60 * 1000);

  perfTest(
    'Import SRP with +50 accounts, SRP 1, SRP 2, SRP 3',
    { tag: '@accounts-team' },
    async ({ currentDeviceDetails, driver, performanceTracker }) => {
      const importedSrp = process.env.TEST_SRP_2;

      if (!importedSrp) {
        throw new Error(
          'TEST_SRP_2 environment variable is required for this performance test.',
        );
      }

      await loginToAppPlaywright();

      const accountListTimer = new TimerHelper(
        'Time since the user clicks on "Account list" button until the account list is visible',
        { ios: 2500, android: 3000 },
        currentDeviceDetails.platform,
      );
      const addAccountTimer = new TimerHelper(
        'Time since the user clicks on "Add account" button until the next modal is visible',
        { ios: 1000, android: 1700 },
        currentDeviceDetails.platform,
      );
      const importSrpTimer = new TimerHelper(
        'Time since the user clicks on "Import SRP" button until SRP field is displayed',
        { ios: 1700, android: 1700 },
        currentDeviceDetails.platform,
      );
      const walletReadyTimer = new TimerHelper(
        'Time since the user clicks on "Continue" button on SRP screen until Wallet main screen is visible',
        { ios: 5000, android: 2000 },
        currentDeviceDetails.platform,
      );

      await WalletView.tapIdenticon();
      await accountListTimer.measure(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          asPlaywrightElement(AccountListBottomSheet.accountList),
          {
            description: 'Account list should be visible',
          },
        );
      });

      await AccountListBottomSheet.waitForAccountSyncToComplete();
      await AccountListBottomSheet.tapAddAccountButton();
      await addAccountTimer.measure(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          asPlaywrightElement(AddAccountBottomSheet.importSrpButton),
          {
            description: 'Add account bottom sheet should be visible',
          },
        );
      });

      await AddAccountBottomSheet.tapImportSrp();
      await importSrpTimer.measure(async () => {
        await ImportWalletView.isScreenTitleVisible(false);
      });

      await ImportWalletView.typeSecretRecoveryPhrase(importedSrp, false);
      await PlaywrightGestures.hideKeyboard();
      await ImportWalletView.tapContinueButton(false);

      await walletReadyTimer.measure(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          asPlaywrightElement(WalletView.accountIcon),
          {
            description:
              'Wallet main screen should be visible after importing SRP',
          },
        );
      });

      performanceTracker.addTimers(
        accountListTimer,
        addAccountTimer,
        importSrpTimer,
        walletReadyTimer,
      );
    },
  );
});
