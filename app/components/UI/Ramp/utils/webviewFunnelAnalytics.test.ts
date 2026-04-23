import { UnifiedRampRoutingType } from '../../../../reducers/fiatOrders';
import { buildBaseProps, extractHostname } from './webviewFunnelAnalytics';

describe('webviewFunnelAnalytics', () => {
  describe('buildBaseProps', () => {
    it('returns all base fields when every argument is supplied', () => {
      expect(
        buildBaseProps({
          flowId: 'flow-1',
          providerName: 'MoonPay',
          rampRouting: UnifiedRampRoutingType.AGGREGATOR,
        }),
      ).toEqual({
        flow_id: 'flow-1',
        location: 'Checkout',
        ramp_type: 'UNIFIED_BUY_2',
        provider_name: 'MoonPay',
        ramp_routing: UnifiedRampRoutingType.AGGREGATOR,
      });
    });

    it('omits provider_name and ramp_routing when absent', () => {
      const result = buildBaseProps({ flowId: 'flow-2' });
      expect(result.flow_id).toBe('flow-2');
      expect(result.location).toBe('Checkout');
      expect(result.ramp_type).toBe('UNIFIED_BUY_2');
      expect(result.provider_name).toBeUndefined();
      expect(result.ramp_routing).toBeUndefined();
    });

    it('coerces null ramp_routing to undefined', () => {
      const result = buildBaseProps({ flowId: 'flow-3', rampRouting: null });
      expect(result.ramp_routing).toBeUndefined();
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
