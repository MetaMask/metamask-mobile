import * as urls from './urls';

describe('URL Constants', () => {
  describe('Support URLs with UTM parameters', () => {
    it('should include utm_source=mobile_app in SRP_GUIDE_URL', () => {
      expect(urls.SRP_GUIDE_URL).toContain('support.metamask.io');
      expect(urls.SRP_GUIDE_URL).toContain('utm_source=mobile_app');
    });

    it('should include utm_source=mobile_app in NON_CUSTODIAL_WALLET_URL', () => {
      expect(urls.NON_CUSTODIAL_WALLET_URL).toContain('support.metamask.io');
      expect(urls.NON_CUSTODIAL_WALLET_URL).toContain('utm_source=mobile_app');
    });

    it('should include utm_source=mobile_app in KEEP_SRP_SAFE_URL', () => {
      expect(urls.KEEP_SRP_SAFE_URL).toContain('support.metamask.io');
      expect(urls.KEEP_SRP_SAFE_URL).toContain('utm_source=mobile_app');
    });

    it('should include utm_source=mobile_app in PRIVATE_KEY_GUIDE_URL', () => {
      expect(urls.PRIVATE_KEY_GUIDE_URL).toContain('support.metamask.io');
      expect(urls.PRIVATE_KEY_GUIDE_URL).toContain('utm_source=mobile_app');
    });

    it('should include utm_source=mobile_app in LEARN_MORE_URL', () => {
      expect(urls.LEARN_MORE_URL).toContain('support.metamask.io');
      expect(urls.LEARN_MORE_URL).toContain('utm_source=mobile_app');
    });

    it('should include utm_source=mobile_app in SIMULATION_DETALS_ARTICLE_URL', () => {
      expect(urls.SIMULATION_DETALS_ARTICLE_URL).toContain(
        'support.metamask.io',
      );
      expect(urls.SIMULATION_DETALS_ARTICLE_URL).toContain(
        'utm_source=mobile_app',
      );
    });

    it('should include utm_source=mobile_app in TOKEN_APPROVAL_SPENDING_CAP', () => {
      expect(urls.TOKEN_APPROVAL_SPENDING_CAP).toContain('support.metamask.io');
      expect(urls.TOKEN_APPROVAL_SPENDING_CAP).toContain(
        'utm_source=mobile_app',
      );
    });

    it('should include utm_source=mobile_app in CONNECTING_TO_A_DECEPTIVE_SITE', () => {
      expect(urls.CONNECTING_TO_A_DECEPTIVE_SITE).toContain(
        'support.metamask.io',
      );
      expect(urls.CONNECTING_TO_A_DECEPTIVE_SITE).toContain(
        'utm_source=mobile_app',
      );
    });

    it('should include utm_source=mobile_app in CONNECTING_TO_DEPRECATED_NETWORK', () => {
      expect(urls.CONNECTING_TO_DEPRECATED_NETWORK).toContain(
        'support.metamask.io',
      );
      expect(urls.CONNECTING_TO_DEPRECATED_NETWORK).toContain(
        'utm_source=mobile_app',
      );
    });

    it('should include utm_source=mobile_app in HOWTO_MANAGE_METAMETRICS', () => {
      expect(urls.HOWTO_MANAGE_METAMETRICS).toContain('support.metamask.io');
      expect(urls.HOWTO_MANAGE_METAMETRICS).toContain('utm_source=mobile_app');
    });

    it('should include utm_source=mobile_app in ADD_CUSTOM_NETWORK_ARTCILE', () => {
      expect(urls.ADD_CUSTOM_NETWORK_ARTCILE).toContain('support.metamask.io');
      expect(urls.ADD_CUSTOM_NETWORK_ARTCILE).toContain(
        'utm_source=mobile_app',
      );
    });

    it('should include utm_source=mobile_app in HOW_TO_MANAGE_METRAMETRICS_SETTINGS', () => {
      expect(urls.HOW_TO_MANAGE_METRAMETRICS_SETTINGS).toContain(
        'support.metamask.io',
      );
      expect(urls.HOW_TO_MANAGE_METRAMETRICS_SETTINGS).toContain(
        'utm_source=mobile_app',
      );
    });
  });

  describe('Community and other URLs', () => {
    it('should have WHY_TRANSACTION_TAKE_TIME_URL without UTM (community URL)', () => {
      expect(urls.WHY_TRANSACTION_TAKE_TIME_URL).toContain(
        'community.metamask.io',
      );
      expect(urls.WHY_TRANSACTION_TAKE_TIME_URL).not.toContain('utm_source');
    });

    it('should have CONSENSYS_PRIVACY_POLICY without UTM', () => {
      expect(urls.CONSENSYS_PRIVACY_POLICY).toContain('consensys.net');
      expect(urls.CONSENSYS_PRIVACY_POLICY).not.toContain('utm_source');
    });
  });

  describe('URL format validation', () => {
    const supportUrls = [
      urls.SRP_GUIDE_URL,
      urls.NON_CUSTODIAL_WALLET_URL,
      urls.KEEP_SRP_SAFE_URL,
      urls.PRIVATE_KEY_GUIDE_URL,
      urls.LEARN_MORE_URL,
      urls.SIMULATION_DETALS_ARTICLE_URL,
      urls.TOKEN_APPROVAL_SPENDING_CAP,
      urls.CONNECTING_TO_A_DECEPTIVE_SITE,
      urls.CONNECTING_TO_DEPRECATED_NETWORK,
      urls.HOWTO_MANAGE_METAMETRICS,
      urls.ADD_CUSTOM_NETWORK_ARTCILE,
      urls.HOW_TO_MANAGE_METRAMETRICS_SETTINGS,
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
});
