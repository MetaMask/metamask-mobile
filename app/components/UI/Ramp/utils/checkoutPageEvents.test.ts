import { getCheckoutPageEventAdapter } from './checkoutPageEvents';
import { coinbaseCheckoutPageEventAdapter } from './coinbaseEmbedded';

describe('getCheckoutPageEventAdapter', () => {
  it.each(['coinbase', 'coinbase-m', '/providers/coinbase-m'])(
    'resolves the Coinbase adapter for %s',
    (providerId) => {
      expect(getCheckoutPageEventAdapter(providerId)).toBe(
        coinbaseCheckoutPageEventAdapter,
      );
    },
  );

  it.each(['moonpay', '/providers/transak', 'coinbasex'])(
    'returns undefined for %s',
    (providerId) => {
      expect(getCheckoutPageEventAdapter(providerId)).toBeUndefined();
    },
  );

  it('returns undefined without a provider id', () => {
    expect(getCheckoutPageEventAdapter(undefined)).toBeUndefined();
    expect(getCheckoutPageEventAdapter('')).toBeUndefined();
  });
});
