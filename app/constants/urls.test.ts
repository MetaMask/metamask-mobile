import {
  SRP_GUIDE_URL,
  NON_CUSTODIAL_WALLET_URL,
  KEEP_SRP_SAFE_URL,
  PRIVATE_KEY_GUIDE_URL,
  LEARN_MORE_URL,
  SIMULATION_DETALS_ARTICLE_URL,
  TOKEN_APPROVAL_SPENDING_CAP,
  CONNECTING_TO_A_DECEPTIVE_SITE,
  CONNECTING_TO_DEPRECATED_NETWORK,
  HOWTO_MANAGE_METAMETRICS,
  ADD_CUSTOM_NETWORK_ARTCILE,
  HOW_TO_MANAGE_METRAMETRICS_SETTINGS,
  WHY_TRANSACTION_TAKE_TIME_URL,
  CONSENSYS_PRIVACY_POLICY,
} from './urls';

describe('URL Constants', () => {
  describe('Support URLs with UTM parameters', () => {
    it('should include utm_source=mobile_app in SRP_GUIDE_URL', () => {
      expect(SRP_GUIDE_URL).toContain('support.metamask.io');
      expect(SRP_GUIDE_URL).toContain('utm_source=mobile_app');
    });

    it('should include utm_source=mobile_app in NON_CUSTODIAL_WALLET_URL', () => {
      expect(NON_CUSTODIAL_WALLET_URL).toContain('support.metamask.io');
      expect(NON_CUSTODIAL_WALLET_URL).toContain('utm_source=mobile_app');
    });

    it('should include utm_source=mobile_app in KEEP_SRP_SAFE_URL', () => {
      expect(KEEP_SRP_SAFE_URL).toContain('support.metamask.io');
      expect(KEEP_SRP_SAFE_URL).toContain('utm_source=mobile_app');
    });

    it('should include utm_source=mobile_app in PRIVATE_KEY_GUIDE_URL', () => {
      expect(PRIVATE_KEY_GUIDE_URL).toContain('support.metamask.io');
      expect(PRIVATE_KEY_GUIDE_URL).toContain('utm_source=mobile_app');
    });

    it('should include utm_source=mobile_app in LEARN_MORE_URL', () => {
      expect(LEARN_MORE_URL).toContain('support.metamask.io');
      expect(LEARN_MORE_URL).toContain('utm_source=mobile_app');
    });

    it('should include utm_source=mobile_app in SIMULATION_DETALS_ARTICLE_URL', () => {
      expect(SIMULATION_DETALS_ARTICLE_URL).toContain(
        'support.metamask.io',
      );
      expect(SIMULATION_DETALS_ARTICLE_URL).toContain(
        'utm_source=mobile_app',
      );
    });

    it('should include utm_source=mobile_app in TOKEN_APPROVAL_SPENDING_CAP', () => {
      expect(TOKEN_APPROVAL_SPENDING_CAP).toContain('support.metamask.io');
      expect(TOKEN_APPROVAL_SPENDING_CAP).toContain(
        'utm_source=mobile_app',
      );
    });

    it('should include utm_source=mobile_app in CONNECTING_TO_A_DECEPTIVE_SITE', () => {
      expect(CONNECTING_TO_A_DECEPTIVE_SITE).toContain(
        'support.metamask.io',
      );
      expect(CONNECTING_TO_A_DECEPTIVE_SITE).toContain(
        'utm_source=mobile_app',
      );
    });

    it('should include utm_source=mobile_app in CONNECTING_TO_DEPRECATED_NETWORK', () => {
      expect(CONNECTING_TO_DEPRECATED_NETWORK).toContain(
        'support.metamask.io',
      );
      expect(CONNECTING_TO_DEPRECATED_NETWORK).toContain(
        'utm_source=mobile_app',
      );
    });

    it('should include utm_source=mobile_app in HOWTO_MANAGE_METAMETRICS', () => {
      expect(HOWTO_MANAGE_METAMETRICS).toContain('support.metamask.io');
      expect(HOWTO_MANAGE_METAMETRICS).toContain('utm_source=mobile_app');
    });

    it('should include utm_source=mobile_app in ADD_CUSTOM_NETWORK_ARTCILE', () => {
      expect(ADD_CUSTOM_NETWORK_ARTCILE).toContain('support.metamask.io');
      expect(ADD_CUSTOM_NETWORK_ARTCILE).toContain(
        'utm_source=mobile_app',
      );
    });

    it('should include utm_source=mobile_app in HOW_TO_MANAGE_METRAMETRICS_SETTINGS', () => {
      expect(HOW_TO_MANAGE_METRAMETRICS_SETTINGS).toContain(
        'support.metamask.io',
      );
      expect(HOW_TO_MANAGE_METRAMETRICS_SETTINGS).toContain(
        'utm_source=mobile_app',
      );
    });
  });

  describe('Community and other URLs', () => {
    it('should have WHY_TRANSACTION_TAKE_TIME_URL without UTM (community URL)', () => {
      expect(WHY_TRANSACTION_TAKE_TIME_URL).toContain(
        'community.metamask.io',
      );
      expect(WHY_TRANSACTION_TAKE_TIME_URL).not.toContain('utm_source');
    });

    it('should have CONSENSYS_PRIVACY_POLICY without UTM', () => {
      expect(CONSENSYS_PRIVACY_POLICY).toContain('consensys.net');
      expect(CONSENSYS_PRIVACY_POLICY).not.toContain('utm_source');
    });
  });

  describe('URL format validation', () => {
    const supportUrls = [
      SRP_GUIDE_URL,
      NON_CUSTODIAL_WALLET_URL,
      KEEP_SRP_SAFE_URL,
      PRIVATE_KEY_GUIDE_URL,
      LEARN_MORE_URL,
      SIMULATION_DETALS_ARTICLE_URL,
      TOKEN_APPROVAL_SPENDING_CAP,
      CONNECTING_TO_A_DECEPTIVE_SITE,
      CONNECTING_TO_DEPRECATED_NETWORK,
      HOWTO_MANAGE_METAMETRICS,
      ADD_CUSTOM_NETWORK_ARTCILE,
      HOW_TO_MANAGE_METRAMETRICS_SETTINGS,
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
