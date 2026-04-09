import { strings } from '../../locales/i18n';

export const CHOOSE_PASSWORD_STEPS = [
  strings('choose_password.title'),
  strings('choose_password.secure'),
  strings('choose_password.confirm'),
];

export const MANUAL_BACKUP_STEPS = [
  strings('manual_backup.progressOne'),
  strings('manual_backup.progressTwo'),
  strings('manual_backup.progressThree'),
];

export const WRONG_PASSWORD_ERROR = 'Error: Decrypt failed';
export const SEED_PHRASE = 'seed_phrase';
export const CONFIRM_PASSWORD = 'confirm_password';

export enum AccountType {
  Metamask = 'metamask',
  Imported = 'imported',
  MetamaskGoogle = 'metamask_google',
  ImportedGoogle = 'imported_google',
  MetamaskApple = 'metamask_apple',
  ImportedApple = 'imported_apple',
}

const socialAccountTypeMap: Record<
  string,
  { new: AccountType; existing: AccountType }
> = {
  google: {
    new: AccountType.MetamaskGoogle,
    existing: AccountType.ImportedGoogle,
  },
  apple: {
    new: AccountType.MetamaskApple,
    existing: AccountType.ImportedApple,
  },
};

export function getSocialAccountType(
  provider: string,
  existingUser: boolean,
): AccountType {
  const mapping = socialAccountTypeMap[provider];
  if (!mapping) {
    return existingUser ? AccountType.Imported : AccountType.Metamask;
  }
  return existingUser ? mapping.existing : mapping.new;
}

export enum ONBOARDING_SUCCESS_FLOW {
  BACKED_UP_SRP = 'backedUpSRP',
  NO_BACKED_UP_SRP = 'noBackedUpSRP',
  IMPORT_FROM_SEED_PHRASE = 'importFromSeedPhrase',
  SETTINGS_BACKUP = 'settingsBackup',
  REMINDER_BACKUP = 'reminderBackup',
}
