import { getChangedSpecFiles, isSpecFile } from './test-infrastructure-paths';
import { checkHardRules } from './handlers';

const BASE_DIR = process.cwd();

describe('test-infrastructure-paths', () => {
  describe('getChangedSpecFiles', () => {
    it('includes smoke spec files under tests/smoke-appium/', () => {
      const changedFiles = [
        'tests/smoke-appium/accounts/create-wallet-account.spec.ts',
      ];

      const result = getChangedSpecFiles(changedFiles);

      expect(result).toEqual([
        'tests/smoke-appium/accounts/create-wallet-account.spec.ts',
      ]);
    });

    it('includes smoke spec files under tests/smoke/', () => {
      const changedFiles = ['tests/smoke/swap/swap-action-smoke.spec.ts'];

      const result = getChangedSpecFiles(changedFiles);

      expect(result).toEqual(changedFiles);
    });

    it('excludes regression spec files from smoke tag selection scope', () => {
      const changedFiles = [
        'tests/regression/accounts/change-account-name.spec.ts',
      ];

      const result = getChangedSpecFiles(changedFiles);

      expect(result).toEqual([]);
    });
  });

  describe('isSpecFile', () => {
    it('returns true for smoke spec paths under tests/smoke-appium/', () => {
      expect(
        isSpecFile('tests/smoke-appium/accounts/create-wallet-account.spec.ts'),
      ).toBe(true);
    });

    it('returns false for non-spec test utilities', () => {
      expect(
        isSpecFile('tests/page-objects/wallet/AccountListBottomSheet.ts'),
      ).toBe(false);
    });
  });
});

describe('checkHardRules', () => {
  const context = {
    baseDir: BASE_DIR,
    baseBranch: 'origin/main',
  };

  it('selects SmokeAccounts when only an accounts smoke spec changes', () => {
    const changedFiles = [
      'tests/smoke-appium/accounts/create-wallet-account.spec.ts',
    ];

    const result = checkHardRules(changedFiles, context);

    expect(result).not.toBeNull();
    expect(result?.selectedTags).toContain('SmokeAccounts');
    expect(result?.confidence).toBeGreaterThanOrEqual(90);
  });

  it('selects SmokeAccounts when shared page object and accounts smoke spec change together', () => {
    const changedFiles = [
      'tests/page-objects/wallet/AccountListBottomSheet.ts',
      'tests/smoke-appium/accounts/create-wallet-account.spec.ts',
    ];

    const result = checkHardRules(changedFiles, context);

    expect(result).not.toBeNull();
    expect(result?.selectedTags).toContain('SmokeAccounts');
  });

  it('includes smoke spec tags when a shared page object affects smoke importers', () => {
    const changedFiles = [
      'tests/page-objects/wallet/AccountListBottomSheet.ts',
    ];

    const result = checkHardRules(changedFiles, context);

    expect(result).not.toBeNull();
    expect(result?.selectedTags).toContain('SmokeAccounts');
  });
});
