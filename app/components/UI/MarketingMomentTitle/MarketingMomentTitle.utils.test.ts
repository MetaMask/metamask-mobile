import { FontFamily, TextVariant } from '@metamask/design-system-react-native';
import {
  getMarketingMomentTitlePresentation,
  supportsGrotzecLocale,
} from './MarketingMomentTitle.utils';

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
  it.each([
    [
      TextVariant.DisplayXl,
      'py-3 leading-[48px] tracking-[-1.2px] -mb-[12px]',
      'leading-[66px] tracking-[-1.2px]',
    ],
    [
      TextVariant.DisplayLg,
      'py-2 leading-[32px] tracking-[-0.8px] -mb-[8px]',
      'leading-[44px] tracking-[-0.8px]',
    ],
    [
      TextVariant.DisplayMd,
      'py-[6.4px] leading-[25.6px] tracking-[-0.64px] -mb-[6.4px]',
      'leading-[35.2px] tracking-[-0.64px]',
    ],
    [
      TextVariant.HeadingLg,
      'py-[4.8px] leading-[19.2px] tracking-[-0.48px] -mb-[4.8px]',
      'leading-[26.4px] tracking-[-0.48px]',
    ],
    [
      TextVariant.HeadingMd,
      'py-1 leading-[16px] tracking-[-0.4px] -mb-[4px]',
      'leading-[22px] tracking-[-0.4px]',
    ],
    [
      TextVariant.HeadingSm,
      'py-[3.2px] leading-[12.8px] tracking-[-0.32px] -mb-[3.2px]',
      'leading-[17.6px] tracking-[-0.32px]',
    ],
  ] as const)(
    'uses the Grotzec classes for %s',
    (variant, iosClassName, androidClassName) => {
      expect(getMarketingMomentTitlePresentation(true, 'ios', variant)).toEqual(
        {
          variant,
          fontFamily: FontFamily.Hero,
          className: iosClassName,
        },
      );
      expect(
        getMarketingMomentTitlePresentation(true, 'android', variant),
      ).toEqual({
        variant,
        fontFamily: FontFamily.Hero,
        className: androidClassName,
      });
    },
  );

  it('defaults to the DisplayXl Grotzec classes', () => {
    expect(getMarketingMomentTitlePresentation(true, 'ios')).toEqual({
      variant: TextVariant.DisplayXl,
      fontFamily: FontFamily.Hero,
      className: 'py-3 leading-[48px] tracking-[-1.2px] -mb-[12px]',
    });
  });

  it.each([
    [TextVariant.DisplayXl, TextVariant.DisplayLg],
    [TextVariant.DisplayLg, TextVariant.DisplayMd],
    [TextVariant.DisplayMd, TextVariant.HeadingLg],
    [TextVariant.HeadingLg, TextVariant.HeadingLg],
    [TextVariant.HeadingMd, TextVariant.HeadingMd],
    [TextVariant.HeadingSm, TextVariant.HeadingSm],
  ] as const)(
    'steps %s to %s when Grotzec is not supported',
    (variant, unsupportedVariant) => {
      expect(
        getMarketingMomentTitlePresentation(false, 'ios', variant),
      ).toEqual({
        variant: unsupportedVariant,
        style: {
          fontFamily: 'System',
          fontWeight: '700',
        },
      });
      expect(
        getMarketingMomentTitlePresentation(false, 'android', variant).style,
      ).toEqual({
        fontFamily: 'Roboto',
        fontWeight: '700',
      });
    },
  );
});
