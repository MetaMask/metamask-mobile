import { buildBaseProps, extractHostname } from './webviewFunnelAnalytics';

describe('webviewFunnelAnalytics', () => {
  describe('buildBaseProps', () => {
    it('returns all base fields when every argument is supplied', () => {
      expect(
        buildBaseProps({
          checkoutSessionId: 'session-1',
          providerName: 'MoonPay',
        }),
      ).toEqual({
        checkout_session_id: 'session-1',
        location: 'Checkout',
        ramp_type: 'UNIFIED_BUY_2',
        provider_name: 'MoonPay',
      });
    });

    it('omits provider_name when absent', () => {
      const result = buildBaseProps({ checkoutSessionId: 'session-2' });
      expect(result.checkout_session_id).toBe('session-2');
      expect(result.location).toBe('Checkout');
      expect(result.ramp_type).toBe('UNIFIED_BUY_2');
      expect(result.provider_name).toBeUndefined();
    });

    it('applies HEADLESS overrides (ramp_type, ramp_surface, region)', () => {
      expect(
        buildBaseProps({
          checkoutSessionId: 'session-4',
          providerName: 'Transak',
          rampType: 'HEADLESS',
          rampSurface: 'money_account',
          region: 'us-ca',
        }),
      ).toEqual({
        checkout_session_id: 'session-4',
        location: 'Checkout',
        ramp_type: 'HEADLESS',
        ramp_surface: 'money_account',
        region: 'us-ca',
        provider_name: 'Transak',
      });
    });
  });

  describe('extractHostname', () => {
    it('returns hostname for a standard URL', () => {
      expect(extractHostname('https://provider.example.com/checkout')).toBe(
        'provider.example.com',
      );
    });

    it('returns hostname regardless of query or fragment', () => {
      expect(extractHostname('https://api.example.com/x?foo=bar#frag')).toBe(
        'api.example.com',
      );
    });

    it('returns undefined for unparseable input', () => {
      expect(extractHostname('not a url')).toBeUndefined();
    });

    it('returns undefined for empty input', () => {
      expect(extractHostname('')).toBeUndefined();
    });
  });
});
