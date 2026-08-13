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

    it('excludes legacy tests/smoke/ paths (Detox removed)', () => {
      const changedFiles = ['tests/smoke/swap/swap-action-smoke.spec.ts'];

      const result = getChangedSpecFiles(changedFiles);

      expect(result).toEqual([]);
    });

    it('excludes non-smoke paths from smoke tag selection scope', () => {
      const changedFiles = [
        'tests/page-objects/wallet/AccountListBottomSheet.ts',
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

  it('keeps targeted smoke tags when a page object changes with a performance workflow', () => {
    const changedFiles = [
      '.github/workflows/performance-test-runner.yml',
      'tests/page-objects/Onboarding/ImportWalletView.ts',
      'tests/performance/onboarding/helpers/seedlessOnboardingTimers.ts',
      'tests/performance/onboarding/seedless-apple-onboarding.spec.ts',
    ];

    const result = checkHardRules(changedFiles, context);

    expect(result).not.toBeNull();
    expect(result?.selectedTags).toContain('SmokeWalletPlatform');
    expect(result?.reasoning).toContain('ImportWalletView.ts');
  });

  it('runs all E2E tags when locales/languages/en.json changes', () => {
    const changedFiles = ['locales/languages/en.json'];

    const result = checkHardRules(changedFiles, context);

    expect(result).not.toBeNull();
    expect(result?.reasoning).toContain('en-locale-change');
    expect(result?.selectedTags.length).toBeGreaterThan(1);
    expect(result?.confidence).toBe(100);
  });

  it('runs all E2E tags when en.json is among other changed files', () => {
    const changedFiles = [
      'locales/languages/en.json',
      'app/components/UI/Ramp/Aggregator/Views/BuildQuote/BuildQuote.test.tsx',
    ];

    const result = checkHardRules(changedFiles, context);

    expect(result).not.toBeNull();
    expect(result?.reasoning).toContain('en-locale-change');
    expect(result?.selectedTags.length).toBeGreaterThan(1);
  });

  it('applies shared infra rule when page-object changes alongside .github/ files', () => {
    const changedFiles = [
      '.github/workflows/performance-test-runner.yml',
      'tests/page-objects/wallet/AccountListBottomSheet.ts',
    ];

    const result = checkHardRules(changedFiles, context);

    // Should NOT bail to AI — .github/ is ignorable, shared infra rule should apply
    expect(result).not.toBeNull();
    expect(result?.selectedTags).toContain('SmokeAccounts');
  });

  it('bails to AI when page-object changes alongside actual app code', () => {
    const changedFiles = [
      'app/components/Views/Wallet/index.tsx',
      'tests/page-objects/wallet/AccountListBottomSheet.ts',
    ];

    const result = checkHardRules(changedFiles, context);

    // Should bail to AI — app code changes require AI analysis
    expect(result).toBeNull();
  });
});
