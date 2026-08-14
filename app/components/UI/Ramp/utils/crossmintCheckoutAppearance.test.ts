import type { Colors } from '../../../../util/theme/models';
import {
  applyCrossmintCheckoutAppearance,
  buildCrossmintAppearanceVariables,
  toCrossmintLocale,
} from './crossmintCheckoutAppearance';

// Opaque placeholders rather than hex literals: these values are only ever
// passed through to the URL, so their exact form is irrelevant.
const mockColors = {
  primary: { default: 'primary-default' },
  background: { default: 'background-default' },
  border: { muted: 'border-muted' },
  error: { default: 'error-default' },
  text: { default: 'text-default', alternative: 'text-alternative' },
  warning: { default: 'warning-default' },
} as Colors;

const VARIABLES = buildCrossmintAppearanceVariables(mockColors);

function getAppearance(url: string) {
  const param = new URL(url).searchParams.get('appearance');
  return param ? JSON.parse(param) : null;
}

describe('toCrossmintLocale', () => {
  it('returns the canonical locale for an exact match', () => {
    expect(toCrossmintLocale('zh-TW')).toBe('zh-TW');
  });

  it('matches an exact locale case-insensitively', () => {
    expect(toCrossmintLocale('PT-pt')).toBe('pt-PT');
  });

  it('expands a bare language code', () => {
    expect(toCrossmintLocale('es')).toBe('es-ES');
  });

  it('expands a regional variant to the supported locale', () => {
    expect(toCrossmintLocale('pt-BR')).toBe('pt-PT');
  });

  it('falls back to English for a language Crossmint does not translate', () => {
    expect(toCrossmintLocale('hi')).toBe('en-US');
  });

  it.each([undefined, null, ''])(
    'falls back to English for %p',
    (locale?: string | null) => {
      expect(toCrossmintLocale(locale)).toBe('en-US');
    },
  );
});

describe('buildCrossmintAppearanceVariables', () => {
  it('maps design tokens onto Crossmint colors', () => {
    expect(buildCrossmintAppearanceVariables(mockColors)).toEqual({
      // Matches the design system's `rounded-xl`, the radius of the Continue
      // button the hosted payment button replaces.
      borderRadius: '12px',
      colors: {
        accent: 'primary-default',
        backgroundPrimary: 'background-default',
        borderPrimary: 'border-muted',
        danger: 'error-default',
        textPrimary: 'text-default',
        textSecondary: 'text-alternative',
        warning: 'warning-default',
      },
    });
  });

  it('does not set a font family, which the WebView cannot resolve', () => {
    expect(buildCrossmintAppearanceVariables(mockColors)).not.toHaveProperty(
      'fontFamily',
    );
  });
});

describe('applyCrossmintCheckoutAppearance', () => {
  const rules = {
    DestinationInput: { display: 'hidden' },
    ReceiptEmailInput: { display: 'hidden' },
    FeeSummary: { display: 'hidden' },
  };
  const checkoutUrl = `https://staging.crossmint.com/sdk/2024-03-05/embedded-checkout?orderId=order-1&clientSecret=secret-1&appearance=${encodeURIComponent(
    JSON.stringify({ rules }),
  )}`;

  it('preserves the rules the on-ramp API set', () => {
    const result = applyCrossmintCheckoutAppearance(checkoutUrl, {
      variables: VARIABLES,
      locale: 'en-US',
    });

    expect(getAppearance(result).rules).toEqual(rules);
  });

  it('merges the theme variables in', () => {
    const result = applyCrossmintCheckoutAppearance(checkoutUrl, {
      variables: VARIABLES,
      locale: 'en-US',
    });

    expect(getAppearance(result).variables).toEqual(VARIABLES);
  });

  it('sets the locale', () => {
    const result = applyCrossmintCheckoutAppearance(checkoutUrl, {
      variables: VARIABLES,
      locale: 'fr-FR',
    });

    expect(new URL(result).searchParams.get('locale')).toBe('fr-FR');
  });

  it('leaves the other query params untouched', () => {
    const result = applyCrossmintCheckoutAppearance(checkoutUrl, {
      variables: VARIABLES,
      locale: 'en-US',
    });

    const params = new URL(result).searchParams;
    expect(params.get('orderId')).toBe('order-1');
    expect(params.get('clientSecret')).toBe('secret-1');
  });

  it('adds an appearance param when the URL has none', () => {
    const result = applyCrossmintCheckoutAppearance(
      'https://staging.crossmint.com/sdk/2024-03-05/embedded-checkout?orderId=order-1',
      { variables: VARIABLES, locale: 'en-US' },
    );

    expect(getAppearance(result)).toEqual({ variables: VARIABLES });
  });

  it('lets the app theme win over variables already on the URL', () => {
    const withVariables = `https://staging.crossmint.com/sdk/2024-03-05/embedded-checkout?appearance=${encodeURIComponent(
      JSON.stringify({
        variables: { borderRadius: '2px', fontFamily: 'url-font' },
      }),
    )}`;

    const result = applyCrossmintCheckoutAppearance(withVariables, {
      variables: VARIABLES,
      locale: 'en-US',
    });

    // `borderRadius` is overridden by the app theme; `fontFamily`, which the
    // theme does not set, survives.
    expect(getAppearance(result).variables).toEqual({
      fontFamily: 'url-font',
      ...VARIABLES,
    });
  });

  it('returns the URL unchanged when it cannot be parsed', () => {
    expect(
      applyCrossmintCheckoutAppearance('not-a-url', {
        variables: VARIABLES,
        locale: 'en-US',
      }),
    ).toBe('not-a-url');
  });

  it('returns the URL unchanged when the appearance param is malformed', () => {
    const malformed =
      'https://staging.crossmint.com/sdk/2024-03-05/embedded-checkout?appearance=%7Bnope';

    expect(
      applyCrossmintCheckoutAppearance(malformed, {
        variables: VARIABLES,
        locale: 'en-US',
      }),
    ).toBe(malformed);
  });
});
