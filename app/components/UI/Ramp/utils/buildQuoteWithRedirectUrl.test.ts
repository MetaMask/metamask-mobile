import type { Quote } from '@metamask/ramps-controller';
import { brandColor, darkTheme, lightTheme } from '@metamask/design-tokens';
import {
  appendWidgetThemeToBuyUrl,
  buildQuoteWithWidgetTheme,
  getCheckoutContext,
  getAggregatorRedirectConfig,
  getWidgetRedirectConfig,
} from './buildQuoteWithRedirectUrl';
import { AppThemeKey, type Theme } from '../../../../util/theme/models';

let mockIsPureBlackEnabled = false;

jest.mock('./getRampCallbackBaseUrl', () => ({
  getRampCallbackBaseUrl: () => 'https://callback.example/base',
}));

jest.mock('../../../../util/theme/themeUtils', () => ({
  get isPureBlackEnabled() {
    return mockIsPureBlackEnabled;
  },
}));

const createTheme = (
  themeAppearance: AppThemeKey.light | AppThemeKey.dark,
): Theme => {
  const base = themeAppearance === AppThemeKey.dark ? darkTheme : lightTheme;
  return {
    colors: base.colors,
    themeAppearance,
    typography: base.typography,
    shadows: base.shadows,
    brandColors: brandColor,
  };
};

const makeQuote = (
  browser?: 'APP_BROWSER' | 'IN_APP_OS_BROWSER',
  buyURL = 'https://on-ramp.example/providers/transak/buy',
): Quote =>
  ({
    quote: {
      ...(browser ? { buyWidget: { browser } } : {}),
      buyURL,
    },
  }) as unknown as Quote;

describe('getCheckoutContext', () => {
  describe('network from chainId', () => {
    it('extracts network as part after colon when chainId contains colon', () => {
      const result = getCheckoutContext({ chainId: 'eip155:1' }, '0xabc', null);

      expect(result.network).toBe('1');
    });

    it('uses full chainId as network when chainId has no colon', () => {
      const result = getCheckoutContext({ chainId: '0x1' }, '0xabc', null);

      expect(result.network).toBe('0x1');
    });

    it('returns empty network when chainId is undefined', () => {
      const result = getCheckoutContext(null, '0xabc', null);

      expect(result.network).toBe('');
    });

    it('returns empty network when chainId ends with colon and no suffix', () => {
      const result = getCheckoutContext({ chainId: 'eip155:' }, '0xabc', null);

      expect(result.network).toBe('');
    });
  });
});

describe('getAggregatorRedirectConfig (Phase 1 in-app vs external predicate)', () => {
  it('classifies a quote with no buyWidget.browser as in-app (Checkout WebView callback base)', () => {
    const result = getAggregatorRedirectConfig(makeQuote(), 'moonpay');

    expect(result.useExternalBrowser).toBe(false);
    expect(result.redirectUrl).toBe('https://callback.example/base');
  });

  it('classifies APP_BROWSER as in-app', () => {
    const result = getAggregatorRedirectConfig(
      makeQuote('APP_BROWSER'),
      'moonpay',
    );

    expect(result.useExternalBrowser).toBe(false);
    expect(result.redirectUrl).toBe('https://callback.example/base');
  });

  it('classifies IN_APP_OS_BROWSER as external (provider deeplink)', () => {
    const result = getAggregatorRedirectConfig(
      makeQuote('IN_APP_OS_BROWSER'),
      'coinbase',
    );

    expect(result.useExternalBrowser).toBe(true);
    expect(result.redirectUrl).toBe('metamask://on-ramp/providers/coinbase');
  });
});

describe('getWidgetRedirectConfig', () => {
  it('routes a custom action to the external provider deeplink regardless of browser', () => {
    const result = getWidgetRedirectConfig(makeQuote(), 'paypal', true);

    expect(result.useExternalBrowser).toBe(true);
    expect(result.redirectUrl).toBe('metamask://on-ramp/providers/paypal');
  });

  it('delegates a non-custom aggregator quote to the aggregator config (in-app)', () => {
    const result = getWidgetRedirectConfig(
      makeQuote('APP_BROWSER'),
      'moonpay',
      false,
    );

    expect(result.useExternalBrowser).toBe(false);
    expect(result.redirectUrl).toBe('https://callback.example/base');
  });
});

describe('appendWidgetThemeToBuyUrl', () => {
  beforeEach(() => {
    mockIsPureBlackEnabled = false;
  });

  it('returns the original buy URL when pure black is disabled', () => {
    const buyURL = 'https://on-ramp.example/providers/transak/buy';

    expect(
      appendWidgetThemeToBuyUrl(buyURL, createTheme(AppThemeKey.dark)),
    ).toBe(buyURL);
  });

  it('appends widget theme params when pure black is enabled', () => {
    mockIsPureBlackEnabled = true;
    const theme = createTheme(AppThemeKey.dark);
    const result = appendWidgetThemeToBuyUrl(
      'https://on-ramp.example/providers/transak/buy',
      theme,
    );
    const parsed = new URL(result);

    expect(parsed.searchParams.get('colorMode')).toBe('DARK');
    expect(parsed.searchParams.get('widgetBackgroundFillColor')).toBe(
      theme.colors.background.alternative,
    );
    expect(parsed.searchParams.get('backgroundColors')).toBe(
      [
        theme.colors.background.alternative,
        theme.colors.background.alternative,
        theme.colors.background.muted,
      ].join(','),
    );
  });
});

describe('buildQuoteWithWidgetTheme', () => {
  beforeEach(() => {
    mockIsPureBlackEnabled = false;
  });

  it('rewrites redirect and theme params on the quote buy URL', () => {
    mockIsPureBlackEnabled = true;
    const theme = createTheme(AppThemeKey.dark);
    const quote = makeQuote('APP_BROWSER');
    const result = buildQuoteWithWidgetTheme(
      quote,
      'https://callback.example/base',
      theme,
    );
    const parsed = new URL(result.quote?.buyURL ?? '');

    expect(parsed.searchParams.get('redirectUrl')).toBe(
      'https://callback.example/base',
    );
    expect(parsed.searchParams.get('widgetBackgroundFillColor')).toBe(
      theme.colors.background.alternative,
    );
  });
});
