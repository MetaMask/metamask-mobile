import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeAccounts } from '../../tags.js';
import { ensureAccountListOpenPlaywright } from '../../flows/wallet.flow.js';
import ManageAccounts from '../../page-objects/MultichainAccounts/ManageAccounts.js';
import RemoveWallet from '../../page-objects/MultichainAccounts/RemoveWallet.js';
import AddWalletView from '../../page-objects/Onboarding/AddWalletView.js';
import AccountListBottomSheet from '../../page-objects/wallet/AccountListBottomSheet.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import Assertions from '../../framework/Assertions.js';
import Utilities from '../../framework/Utilities.js';
import {
  manageAccountsBackAndReopenAccountList,
  manageAccountsLoginAndOpenAccountList,
} from './manage-accounts-utils.js';

/**
 * Wallet-level create / remove coverage.
 *
 * Create goes through the Add Wallet sheet's "Create a new wallet" row
 * (`AddWallet`, testID `add-wallet-create-new-wallet-button`): it generates a
 * fresh SRP, then hands off to the account selector.
 *
 * Remove goes through the remove control on a wallet section header in Manage
 * Accounts and its confirmation sheet
 * (`Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.REMOVE_WALLET`), which deletes the
 * wallet together with every account it owns.
 *
 * The primary HD wallet is deliberately not removable (`KeyringController`
 * hard-throws for `keyrings[0]`), so its header exposes no remove affordance —
 * pinned by the last test below. Per-account removal (imported / hardware) lives
 * in `manage-accounts-delete-accounts.spec.ts`.
 */

/**
 * Wallet display names are computed by the AccountTreeController's entropy rule
 * as `Wallet ${entropySourceIndex + 1}` — the 1-based position among HD
 * keyrings. The second HD keyring is therefore `Wallet 2`.
 */
const SECONDARY_WALLET_NAME = 'Wallet 2';

/** The only HD keyring in the default fixture, so it is the primary wallet. */
const PRIMARY_WALLET_NAME = 'Wallet 1';

const VISIBLE_TIMEOUT_MS = 15_000;

/**
 * Counts account rows in the account list.
 *
 * Every multichain account group name is prefixed with `Account` (the entropy
 * rule's `getDefaultAccountGroupPrefix`), and the lookup is anchored to the
 * account-row cell, so a substring match on `'Account'` counts rows without
 * depending on the fixture's per-wallet account naming.
 *
 * @returns The number of account rows currently rendered.
 */
const countAccountRows = async (): Promise<number> =>
  (await AccountListBottomSheet.getAccountElementsByAccountNameV2('Account'))
    .length;

/**
 * Waits for the account list to settle on the expected number of rows.
 *
 * @param expected - Expected number of account rows.
 * @param timeout - Retry window, since keyring removal is asynchronous.
 */
const waitForAccountRowCount = async (
  expected: number,
  timeout = VISIBLE_TIMEOUT_MS,
): Promise<void> => {
  await Utilities.executeWithRetry(
    async () => (await countAccountRows()) === expected,
    {
      description: `Account list should settle on ${expected} account rows`,
      timeout,
      interval: 500,
    },
  );
};

appiumTest.describe(
  SmokeAccounts('Manage accounts wallet-level create/remove'),
  () => {
    appiumTest(
      'creates a new wallet from the Add wallet sheet',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder().build(),
            restartDevice: true,
            currentDeviceDetails,
          },
          async () => {
            await manageAccountsLoginAndOpenAccountList();

            // The Add Wallet sheet is reached from the account list header.
            await AccountListBottomSheet.openAddWalletSheet();
            await AddWalletView.expectScreenVisible();
            await AddWalletView.tapCreateNewWallet();

            // Creation hands off to the account selector rather than back to
            // this screen, so re-establish the account list before asserting.
            await ensureAccountListOpenPlaywright();
            await ManageAccounts.tapManageAccountsButton();

            // A second wallet now exists. Its computed name is `Wallet 2`,
            // which is also the naming convention the removal test relies on.
            await Assertions.expectElementToBeVisible(
              ManageAccounts.getSectionHeader(SECONDARY_WALLET_NAME),
              {
                timeout: VISIBLE_TIMEOUT_MS,
                description:
                  'A second wallet section (Wallet 2) should appear after creating a wallet',
              },
            );

            // A freshly created wallet is not backed up yet, but it is still
            // removable — so it must offer Remove rather than read as Locked.
            await Assertions.expectElementToBeVisible(
              ManageAccounts.getSectionHeaderRemoveButton(
                SECONDARY_WALLET_NAME,
              ),
              {
                timeout: VISIBLE_TIMEOUT_MS,
                description:
                  'Newly created wallet should expose a remove control',
              },
            );
            await Assertions.expectElementToNotExist(
              ManageAccounts.getSectionHeaderLockLabel(SECONDARY_WALLET_NAME),
              {
                timeout: 5_000,
                description:
                  'Newly created wallet must not be labelled Locked even though it is not backed up',
              },
            );
          },
        );
      },
    );

    appiumTest(
      'removes a non-primary wallet and all of its accounts',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder()
              .withTwoImportedHdKeyringsAndTwoDefaultAccounts()
              .build(),
            restartDevice: true,
            currentDeviceDetails,
          },
          async () => {
            await manageAccountsLoginAndOpenAccountList();

            // The second HD keyring in this fixture holds exactly one account.
            // Measure the baseline instead of hardcoding it so the assertion
            // does not depend on the primary wallet's account count.
            const rowsBefore = await countAccountRows();
            if (rowsBefore <= 1) {
              throw new Error(
                `Expected the two-wallet fixture to render more than one account row, got ${rowsBefore}`,
              );
            }

            await ManageAccounts.tapManageAccountsButton();
            await Assertions.expectElementToBeVisible(
              ManageAccounts.getSectionHeader(SECONDARY_WALLET_NAME),
              {
                timeout: VISIBLE_TIMEOUT_MS,
                description: 'Second wallet section should be visible',
              },
            );

            await ManageAccounts.tapSectionHeaderRemoveButton(
              SECONDARY_WALLET_NAME,
            );

            // The sheet's container wrapper reports isDisplayed=false while on
            // screen (bottom-sheet flattening), so assert a child control —
            // same convention as the imported-account removal spec.
            await Assertions.expectElementToBeVisible(
              RemoveWallet.removeButton,
              {
                timeout: 10_000,
                description:
                  'Remove wallet confirmation sheet should be present with a remove button',
              },
            );
            await RemoveWallet.tapRemoveButton();

            // The sheet dismisses back to Manage Accounts; the keyring removal
            // is async and can reset the selected account, so the account-list
            // sheet is reopened rather than assumed (same convention as the
            // sibling Manage Accounts specs).
            await manageAccountsBackAndReopenAccountList();

            // The removed wallet's single account went with it.
            await waitForAccountRowCount(rowsBefore - 1);

            // Re-open Manage Accounts so the section-header assertion below runs
            // against a freshly rendered screen (rather than trivially passing
            // because we had navigated away from it).
            await ManageAccounts.tapManageAccountsButton();
            await Assertions.expectElementToNotExist(
              ManageAccounts.getSectionHeader(SECONDARY_WALLET_NAME),
              {
                timeout: VISIBLE_TIMEOUT_MS,
                description:
                  'Removed wallet section should no longer be present',
              },
            );
          },
        );
      },
    );

    appiumTest(
      'marks only the primary wallet as locked and offers removal for the rest',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            // Two HD keyrings: index 0 is the primary (never removable),
            // index 1 is removable. The default fixture cannot cover the
            // removable case because its single keyring *is* the primary one.
            fixture: new FixtureBuilder()
              .withTwoImportedHdKeyringsAndTwoDefaultAccounts()
              .build(),
            restartDevice: true,
            currentDeviceDetails,
          },
          async () => {
            await manageAccountsLoginAndOpenAccountList();
            await ManageAccounts.tapManageAccountsButton();

            // Non-primary wallet: must expose Remove and must NOT read as locked.
            await Assertions.expectElementToBeVisible(
              ManageAccounts.getSectionHeader(SECONDARY_WALLET_NAME),
              {
                timeout: VISIBLE_TIMEOUT_MS,
                description: 'Second wallet section should be visible',
              },
            );
            await Assertions.expectElementToBeVisible(
              ManageAccounts.getSectionHeaderRemoveButton(
                SECONDARY_WALLET_NAME,
              ),
              {
                timeout: VISIBLE_TIMEOUT_MS,
                description:
                  'Non-primary wallet should expose a remove control',
              },
            );
            await Assertions.expectElementToNotExist(
              ManageAccounts.getSectionHeaderLockLabel(SECONDARY_WALLET_NAME),
              {
                timeout: 5_000,
                description:
                  'Removable wallet must not be labelled Locked (regression: every entropy wallet rendered as locked)',
              },
            );

            // Primary wallet: the inverse — locked, with no remove control.
            await Assertions.expectElementToBeVisible(
              ManageAccounts.getSectionHeaderLockLabel(PRIMARY_WALLET_NAME),
              {
                timeout: VISIBLE_TIMEOUT_MS,
                description: 'Primary wallet should be labelled Locked',
              },
            );
            await Assertions.expectElementToNotExist(
              ManageAccounts.getSectionHeaderRemoveButton(PRIMARY_WALLET_NAME),
              {
                timeout: 5_000,
                description:
                  'Primary wallet should not expose a remove control (it cannot be removed)',
              },
            );
          },
        );
      },
    );
  },
);
