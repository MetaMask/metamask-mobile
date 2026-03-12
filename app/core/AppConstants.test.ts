import AppConstants from './AppConstants';

describe('AppConstants', () => {
  describe('URLs with UTM parameters', () => {
    it('should include utm_source=mobile_app in PROFILE_SYNC', () => {
      expect(AppConstants.URLS.PROFILE_SYNC).toContain('support.metamask.io');
      expect(AppConstants.URLS.PROFILE_SYNC).toContain('utm_source=mobile_app');
    });

    it('should include utm_source=mobile_app in CONNECTIVITY_ISSUES', () => {
      expect(AppConstants.URLS.CONNECTIVITY_ISSUES).toContain(
        'support.metamask.io',
      );
      expect(AppConstants.URLS.CONNECTIVITY_ISSUES).toContain(
        'utm_source=mobile_app',
      );
    });

    it('should include utm_source=mobile_app in SECURITY', () => {
      expect(AppConstants.URLS.SECURITY).toContain('support.metamask.io');
      expect(AppConstants.URLS.SECURITY).toContain('utm_source=mobile_app');
    });

    it('should include utm_source=mobile_app in TOKEN_BALANCE', () => {
      expect(AppConstants.URLS.TOKEN_BALANCE).toContain('support.metamask.io');
      expect(AppConstants.URLS.TOKEN_BALANCE).toContain(
        'utm_source=mobile_app',
      );
    });

    it('should include utm_source=mobile_app in TESTNET_ETH_SCAMS', () => {
      expect(AppConstants.URLS.TESTNET_ETH_SCAMS).toContain(
        'support.metamask.io',
      );
      expect(AppConstants.URLS.TESTNET_ETH_SCAMS).toContain(
        'utm_source=mobile_app',
      );
    });

    it('should include utm_source=mobile_app in PRIVACY_BEST_PRACTICES', () => {
      expect(AppConstants.URLS.PRIVACY_BEST_PRACTICES).toContain(
        'support.metamask.io',
      );
      expect(AppConstants.URLS.PRIVACY_BEST_PRACTICES).toContain(
        'utm_source=mobile_app',
      );
    });

    it('should include utm_source=mobile_app in SMART_TXS', () => {
      expect(AppConstants.URLS.SMART_TXS).toContain('support.metamask.io');
      expect(AppConstants.URLS.SMART_TXS).toContain('utm_source=mobile_app');
    });

    it('should include utm_source=mobile_app in SMART_ACCOUNTS', () => {
      expect(AppConstants.URLS.SMART_ACCOUNTS).toContain('support.metamask.io');
      expect(AppConstants.URLS.SMART_ACCOUNTS).toContain(
        'utm_source=mobile_app',
      );
    });

    it('should include utm_source=mobile_app in ADD_SOLANA_ACCOUNT_PRIVACY_POLICY', () => {
      expect(AppConstants.URLS.ADD_SOLANA_ACCOUNT_PRIVACY_POLICY).toContain(
        'support.metamask.io',
      );
      expect(AppConstants.URLS.ADD_SOLANA_ACCOUNT_PRIVACY_POLICY).toContain(
        'utm_source=mobile_app',
      );
    });

    it('should include utm_source=mobile_app in MULTICHAIN_ACCOUNTS', () => {
      expect(AppConstants.URLS.MULTICHAIN_ACCOUNTS).toContain(
        'support.metamask.io',
      );
      expect(AppConstants.URLS.MULTICHAIN_ACCOUNTS).toContain(
        'utm_source=mobile_app',
      );
    });
  });

  describe('Community URLs without UTM', () => {
    it('should have WHY_TRANSACTION_TAKE_TIME without UTM (community URL)', () => {
      expect(AppConstants.URLS.WHY_TRANSACTION_TAKE_TIME).toContain(
        'community.metamask.io',
      );
      expect(AppConstants.URLS.WHY_TRANSACTION_TAKE_TIME).not.toContain(
        'utm_source',
      );
    });

    it('should have WHAT_IS_SRP without UTM (community URL)', () => {
      expect(AppConstants.URLS.WHAT_IS_SRP).toContain('community.metamask.io');
      expect(AppConstants.URLS.WHAT_IS_SRP).not.toContain('utm_source');
    });
  });

  describe('Policy URLs without UTM', () => {
    it('should have TERMS_OF_USE without UTM', () => {
      expect(AppConstants.URLS.TERMS_OF_USE).toContain('metamask.io');
      expect(AppConstants.URLS.TERMS_OF_USE).not.toContain('utm_source');
    });

    it('should have PRIVACY_POLICY without UTM', () => {
      expect(AppConstants.URLS.PRIVACY_POLICY).toContain('consensys.io');
      expect(AppConstants.URLS.PRIVACY_POLICY).not.toContain('utm_source');
    });

    it('should have STAKING_RISK_DISCLOSURE without UTM', () => {
      expect(AppConstants.URLS.STAKING_RISK_DISCLOSURE).toContain(
        'consensys.io',
      );
      expect(AppConstants.URLS.STAKING_RISK_DISCLOSURE).not.toContain(
        'utm_source',
      );
    });

    it('should have EARN_RISK_DISCLOSURE without UTM', () => {
      expect(AppConstants.URLS.EARN_RISK_DISCLOSURE).toContain('consensys.io');
      expect(AppConstants.URLS.EARN_RISK_DISCLOSURE).not.toContain(
        'utm_source',
      );
    });
  });

  describe('URL format validation', () => {
    const supportUrls = [
      AppConstants.URLS.PROFILE_SYNC,
      AppConstants.URLS.CONNECTIVITY_ISSUES,
      AppConstants.URLS.SECURITY,
      AppConstants.URLS.TOKEN_BALANCE,
      AppConstants.URLS.TESTNET_ETH_SCAMS,
      AppConstants.URLS.PRIVACY_BEST_PRACTICES,
      AppConstants.URLS.SMART_TXS,
      AppConstants.URLS.SMART_ACCOUNTS,
      AppConstants.URLS.ADD_SOLANA_ACCOUNT_PRIVACY_POLICY,
      AppConstants.URLS.MULTICHAIN_ACCOUNTS,
    ];

    it('should have valid URL format for all support URLs', () => {
      supportUrls.forEach((url) => {
        expect(() => new URL(url)).not.toThrow();
      });
    });

    it('should have HTTPS protocol for all support URLs', () => {
      supportUrls.forEach((url) => {
        expect(url).toMatch(/^https:\/\//);
      });
    });
  });

  describe('Core constants', () => {
    it('should have valid configuration values', () => {
      expect(AppConstants.DEFAULT_LOCK_TIMEOUT).toBeDefined();
      expect(typeof AppConstants.DEFAULT_LOCK_TIMEOUT).toBe('number');

      expect(AppConstants.DEFAULT_SEARCH_ENGINE).toBeDefined();
      expect(typeof AppConstants.DEFAULT_SEARCH_ENGINE).toBe('string');

      expect(AppConstants.ZERO_ADDRESS).toBe(
        '0x0000000000000000000000000000000000000000',
      );
    });

    it('should have valid notification names', () => {
      expect(AppConstants.NOTIFICATION_NAMES.accountsChanged).toBe(
        'metamask_accountsChanged',
      );
      expect(AppConstants.NOTIFICATION_NAMES.unlockStateChanged).toBe(
        'metamask_unlockStateChanged',
      );
      expect(AppConstants.NOTIFICATION_NAMES.chainChanged).toBe(
        'metamask_chainChanged',
      );
    });
  });
});
