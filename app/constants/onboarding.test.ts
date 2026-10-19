import {
  AccountType,
  getSocialAccountType,
  isImportedSocialAccountType,
} from './onboarding';

describe('isImportedSocialAccountType', () => {
  it.each([
    AccountType.ImportedGoogle,
    AccountType.ImportedApple,
    AccountType.ImportedTelegram,
  ])('returns true for %s', (accountType) => {
    expect(isImportedSocialAccountType(accountType)).toBe(true);
  });

  it('returns true for the existing-user type from getSocialAccountType', () => {
    expect(
      isImportedSocialAccountType(getSocialAccountType('google', true)),
    ).toBe(true);
  });

  it('returns false for a newly created social wallet', () => {
    expect(isImportedSocialAccountType(AccountType.MetamaskGoogle)).toBe(false);
  });

  it('returns false for SRP import', () => {
    expect(isImportedSocialAccountType(AccountType.Imported)).toBe(false);
  });

  it('returns false when no account type was recorded', () => {
    expect(isImportedSocialAccountType(undefined)).toBe(false);
  });
});
