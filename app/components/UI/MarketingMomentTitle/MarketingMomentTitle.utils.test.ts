import { FontFamily, TextVariant } from '@metamask/design-system-react-native';
import { typography } from '@metamask/design-tokens';
import {
  getMarketingMomentTitlePresentation,
  supportsGrotzecLocale,
} from './MarketingMomentTitle.utils';

const fontSize = typography.sDisplayXL.fontSize;

describe('supportsGrotzecLocale', () => {
  it.each(['de', 'en', 'es', 'fr', 'id', 'pt', 'tl', 'tr'])(
    'accepts %s',
    (locale) => {
      expect(supportsGrotzecLocale(locale)).toBe(true);
    },
  );

  it('matches the language subtag of a regional locale', () => {
    expect(supportsGrotzecLocale('en-US')).toBe(true);
    expect(supportsGrotzecLocale('pt_BR')).toBe(true);
    expect(supportsGrotzecLocale('EN')).toBe(true);
  });

  it.each(['el', 'hi', 'ja', 'ko', 'ru', 'vi', 'zh'])(
    'rejects %s',
    (locale) => {
      expect(supportsGrotzecLocale(locale)).toBe(false);
    },
  );

  it('rejects a missing locale', () => {
    expect(supportsGrotzecLocale(undefined)).toBe(false);
    expect(supportsGrotzecLocale(null)).toBe(false);
    expect(supportsGrotzecLocale('')).toBe(false);
  });
});

describe('getMarketingMomentTitlePresentation', () => {
  it('uses the Grotzec display metrics on iOS', () => {
    expect(getMarketingMomentTitlePresentation(true, 'ios')).toEqual({
      variant: TextVariant.DisplayXl,
      fontFamily: FontFamily.Hero,
      className: 'py-3',
      style: {
        lineHeight: fontSize * 0.8,
        letterSpacing: fontSize * -0.02,
        marginBottom: -((fontSize - fontSize * 0.8) / 2),
      },
    });
  });

  it('keeps the Grotzec face on Android with a line box taller than the font', () => {
    expect(getMarketingMomentTitlePresentation(true, 'android')).toEqual({
      variant: TextVariant.DisplayXl,
      fontFamily: FontFamily.Hero,
      style: {
        lineHeight: fontSize * 1.1,
        letterSpacing: fontSize * -0.02,
      },
    });
  });

  it('uses the system face at DisplayLg when Grotzec is not supported', () => {
    expect(getMarketingMomentTitlePresentation(false, 'ios')).toEqual({
      variant: TextVariant.DisplayLg,
      style: {
        fontFamily: 'System',
        fontWeight: '700',
      },
    });
    expect(getMarketingMomentTitlePresentation(false, 'android').style).toEqual(
      {
        fontFamily: 'Roboto',
        fontWeight: '700',
      },
    );
  });
});
