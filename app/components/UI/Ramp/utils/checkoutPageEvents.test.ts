import type { Quote } from '@metamask/ramps-controller';

import {
  getCheckoutPageEventAdapter,
  getQuoteBuyWidgetFallback,
} from './checkoutPageEvents';
import { coinbaseCheckoutPageEventAdapter } from './coinbaseEmbedded';

const makeQuote = (buyWidget?: Record<string, unknown>): Quote =>
  ({
    quote: buyWidget ? { buyWidget } : {},
  }) as unknown as Quote;

describe('getQuoteBuyWidgetFallback', () => {
  it('returns the fallback when present with a url', () => {
    const fallback = {
      url: 'https://pay.coinbase.com/buy',
      browser: 'IN_APP_OS_BROWSER',
    };
    const quote = makeQuote({ url: 'https://example.com', fallback });

    expect(getQuoteBuyWidgetFallback(quote)).toEqual(fallback);
  });

  it('returns undefined when buyWidget has no fallback', () => {
    const quote = makeQuote({ url: 'https://example.com' });

    expect(getQuoteBuyWidgetFallback(quote)).toBeUndefined();
  });

  it('returns undefined when buyWidget is absent', () => {
    const quote = makeQuote();

    expect(getQuoteBuyWidgetFallback(quote)).toBeUndefined();
  });

  it('returns undefined when fallback.url is empty', () => {
    const quote = makeQuote({
      url: 'https://example.com',
      fallback: { url: '', browser: 'IN_APP_OS_BROWSER' },
    });

    expect(getQuoteBuyWidgetFallback(quote)).toBeUndefined();
  });
});

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
