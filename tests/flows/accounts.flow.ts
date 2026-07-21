import ImportSrpView from '../page-objects/importSrp/ImportSrpView';
import AccountListBottomSheet from '../page-objects/wallet/AccountListBottomSheet';
import AddAccountBottomSheet from '../page-objects/wallet/AddAccountBottomSheet';
import ImportAccountView from '../page-objects/importAccount/ImportAccountView';
import SuccessImportAccountView from '../page-objects/importAccount/SuccessImportAccountView';
import WalletView from '../page-objects/wallet/WalletView';
import Assertions from '../framework/Assertions';
import SRPListItemComponent from '../page-objects/wallet/MultiSrp/Common/SRPListItemComponent';
import SrpQuizModal from '../page-objects/Settings/SecurityAndPrivacy/SrpQuizModal';
import RevealSecretRecoveryPhrase from '../page-objects/Settings/SecurityAndPrivacy/RevealSecretRecoveryPhrase';
import TabBarComponent from '../page-objects/wallet/TabBarComponent';
import SettingsView from '../page-objects/Settings/SettingsView';
import BackupAndSyncView from '../page-objects/Settings/BackupAndSyncView';
import SecurityAndPrivacyView from '../page-objects/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';
import AccountMenu from '../page-objects/AccountMenu/AccountMenu';
import CommonView from '../page-objects/CommonView';
import AccountDetails from '../page-objects/MultichainAccounts/AccountDetails';
import EditAccountName from '../page-objects/MultichainAccounts/EditAccountName';
import { PlatformDetector } from '../framework/PlatformLocator';
import { FrameworkDetector } from '../framework/FrameworkDetector';
import Utilities from '../framework/Utilities';
import ContactsView from '../page-objects/Settings/Contacts/ContactsView';
import AddContactView from '../page-objects/Settings/Contacts/AddContactView';
import {
  loginToAppPlaywright,
  waitForWalletHomePlaywright,
} from './wallet.flow';

const PASSWORD = '123123123';

export const openImportSrpFromAccountList = async (): Promise<void> => {
  await AccountListBottomSheet.openAddAccountSheet();
  await AddAccountBottomSheet.tapImportSrp();
  await Assertions.expectElementToBeVisible(ImportSrpView.container);
};

export const goToImportSrp = async () => {
  await WalletView.tapIdenticon();
  await Assertions.expectElementToBeVisible(AccountListBottomSheet.accountList);
  await openImportSrpFromAccountList();
};

export const completeSrpQuiz = async (expectedSrp: string) => {
  await SrpQuizModal.tapGetStartedButton();
  await SrpQuizModal.tapQuestionRightAnswerButton(1);
  await SrpQuizModal.tapQuestionContinueButton(1);
  await SrpQuizModal.tapQuestionRightAnswerButton(2);
  await SrpQuizModal.tapQuestionContinueButton(2);

  // Check if already unlocked (biometrics) or need password entry
  let isAlreadyUnlocked = await RevealSecretRecoveryPhrase.isUnlocked();

  if (!isAlreadyUnlocked) {
    await RevealSecretRecoveryPhrase.enterPasswordToRevealSecretCredential(
      PASSWORD,
    );
    // Re-check: "Done" on keyboard triggers tryUnlock() so app may already be on "Tap to reveal"
    isAlreadyUnlocked = await RevealSecretRecoveryPhrase.isUnlocked();
    if (!isAlreadyUnlocked) {
      await RevealSecretRecoveryPhrase.tapConfirmButton();
    }
  }

  // Tap the blur overlay to reveal the SRP
  await RevealSecretRecoveryPhrase.tapToReveal();
  await Assertions.expectElementToBeVisible(
    RevealSecretRecoveryPhrase.container,
  );
  // SRP is now displayed in grid format - verify first word is displayed
  const srpWords = expectedSrp.split(' ');
  await Assertions.expectTextDisplayed(srpWords[0]);
  await RevealSecretRecoveryPhrase.scrollToCopyToClipboardButton();

  await RevealSecretRecoveryPhrase.tapToRevealPrivateCredentialQRCode();

  if (
    PlatformDetector.isIOS() ||
    (PlatformDetector.isAndroid() && FrameworkDetector.isAppium())
  ) {
    // For some reason, the QR code is visible on Android but detox cannot find it
    await Assertions.expectElementToBeVisible(
      RevealSecretRecoveryPhrase.revealCredentialQRCodeImage,
    );
  }

  await RevealSecretRecoveryPhrase.scrollToDone();
  await RevealSecretRecoveryPhrase.tapDoneButton();
};

export const openAccountActionsFromAccountList = async (
  accountIndex: number,
): Promise<void> => {
  await AccountListBottomSheet.tapAccountEllipsisButtonV2(accountIndex);
  await AccountDetails.tapAccountSrpLink();
};

export const goToAccountActions = async (accountIndex: number) => {
  await WalletView.tapIdenticon();
  await Assertions.expectElementToBeVisible(AccountListBottomSheet.accountList);
  await openAccountActionsFromAccountList(accountIndex);
};

/** Imports an account via the add-account → import private key flow. */
export const importAccountViaPrivateKey = async (
  privateKey: string,
): Promise<void> => {
  await AccountListBottomSheet.openAddWalletSheet();
  await AddAccountBottomSheet.tapImportAccount();
  await Assertions.expectElementToBeVisible(ImportAccountView.container);
  await ImportAccountView.enterPrivateKey(privateKey);
  await Assertions.expectElementToBeVisible(
    SuccessImportAccountView.container,
    {
      description: 'Import success screen should be visible',
      timeout: 30_000,
    },
  );
  await SuccessImportAccountView.tapCloseButton();
  if (FrameworkDetector.isAppium()) {
    await AddAccountBottomSheet.tapBackToWalletView();
  }
};

export const openContactsViaAccountMenu = async (): Promise<void> => {
  await TabBarComponent.tapAccountsMenu();
  await AccountMenu.tapContacts();
  await Assertions.expectElementToBeVisible(ContactsView.container, {
    description: 'Contacts view should be visible',
  });
};

export const loginAndOpenContacts = async (
  options: { scenarioType?: string } = {},
): Promise<void> => {
  await loginToAppPlaywright(options);
  await waitForWalletHomePlaywright(15_000);
  await openContactsViaAccountMenu();
};

export const addContact = async (
  name: string,
  address: string,
): Promise<void> => {
  await ContactsView.tapAddContactButton();
  await Assertions.expectElementToBeVisible(AddContactView.container, {
    description: 'Add contact view should be visible',
  });
  await AddContactView.typeInName(name);
  await AddContactView.typeInAddress(address);
  await AddContactView.tapAddContactButton();
  await Assertions.expectElementToBeVisible(ContactsView.container, {
    description: 'Contacts view should be visible after adding contact',
  });
  await ContactsView.expectContactIsVisible(name);
};

export const disableContactSyncViaSettings = async (): Promise<void> => {
  await TabBarComponent.tapSettings();
  await Assertions.expectElementToBeVisible(
    SettingsView.backupAndSyncSectionButton,
    { description: 'Backup and Sync section should be visible in Settings' },
  );
  await SettingsView.tapBackupAndSync();
  await Assertions.expectElementToBeVisible(
    BackupAndSyncView.backupAndSyncToggle,
    { description: 'Backup and Sync toggle should be visible' },
  );
  await BackupAndSyncView.toggleContactSync();
  await CommonView.tapBackButton();
  await SettingsView.tapBackButton();
};

export const disableAccountSyncViaSettings = async (): Promise<void> => {
  await TabBarComponent.tapSettings();
  await Assertions.expectElementToBeVisible(
    SettingsView.backupAndSyncSectionButton,
    { description: 'Backup and Sync section should be visible in Settings' },
  );
  await SettingsView.tapBackupAndSync();
  await Assertions.expectElementToBeVisible(
    BackupAndSyncView.backupAndSyncToggle,
    { description: 'Backup and Sync toggle should be visible' },
  );
  await BackupAndSyncView.toggleAccountSync();
  await CommonView.tapBackButton();
  await SettingsView.tapBackButton();
  await AccountMenu.tapBack();
};

export const renameAccountAtIndex = async (
  accountIndex: number,
  newName: string,
  options: { shouldWait?: boolean } = {},
): Promise<void> => {
  await AccountListBottomSheet.tapAccountEllipsisButtonV2(accountIndex, {
    shouldWait: options.shouldWait ?? false,
  });
  await AccountDetails.tapEditAccountName();
  await EditAccountName.updateAccountName(newName);
  await EditAccountName.tapSave();
  await AccountDetails.tapBackButton();

  if (FrameworkDetector.isAppium()) {
    await AccountListBottomSheet.waitForAccountListVisible();
  }
};

export const assertAccountCount = async (
  accountName: string,
  expectedCount: number,
  timeout: number = 5000,
): Promise<void> => {
  await Utilities.executeWithRetry(
    async () => {
      const accountElements =
        await AccountListBottomSheet.getAccountElementsByAccountNameV2(
          accountName,
        );
      return accountElements.length === expectedCount;
    },
    {
      description: `Count accounts with name "${accountName}" in the account list`,
      timeout,
      interval: 500,
    },
  );
};

export const startExportForKeyring = async (keyringId: string) => {
  await TabBarComponent.tapSettings();
  await SettingsView.tapSecurityAndPrivacy();
  await SecurityAndPrivacyView.tapRevealSecretRecoveryPhraseButton();
  await SRPListItemComponent.tapListItem(keyringId);
};
