import React from 'react';
import { Platform } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native/Libraries/Components/Touchable/TouchableOpacity', () =>
  jest.requireActual(
    'react-native/Libraries/Components/Touchable/TouchableOpacity',
  ),
);

const mockNativeAddToWalletButton = jest.fn(
  (_props: Record<string, unknown>) => null,
);
jest.mock(
  '@expensify/react-native-wallet',
  () => ({
    AddToWalletButton: (props: Record<string, unknown>) => {
      mockNativeAddToWalletButton(props);
      return null;
    },
  }),
  { virtual: true },
);

import AddToWalletButton, {
  getGoogleWalletButtonSvg,
  GOOGLE_WALLET_BUTTON_BY_REGION,
  GOOGLE_WALLET_BUTTON_BY_LANGUAGE,
} from './AddToWalletButton';

const makeMockSvg = (id: string) =>
  Object.assign(() => null, { displayName: `GWB_${id}` });

const regionEntries: Record<string, string> = {
  en_au: 'enAU',
  en_ca: 'enCA',
  en_gb: 'enGB',
  en_in: 'enIN',
  en_sg: 'enSG',
  en_us: 'enUS',
  en_za: 'enZA',
  es_419: 'es419',
  es_es: 'esES',
  es_us: 'esUS',
  fr_ca: 'frCA',
  fr_fr: 'frFR',
  zh_hk: 'zhHK',
  zh_tw: 'zhTW',
};

Object.entries(regionEntries).forEach(([key, label]) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (GOOGLE_WALLET_BUTTON_BY_REGION as any)[key] = makeMockSvg(label);
});

const languageEntries: Record<string, string> = {
  af: 'af',
  am: 'am',
  ar: 'ar',
  az: 'az',
  be: 'by',
  bg: 'bg',
  bn: 'bn',
  br: 'br',
  bs: 'bs',
  by: 'by',
  ca: 'ca',
  cs: 'cz',
  cz: 'cz',
  da: 'dk',
  de: 'de',
  dk: 'dk',
  el: 'gr',
  en: 'enUS',
  es: 'es419',
  et: 'et',
  fa: 'fa',
  fl: 'fl',
  fp: 'fp',
  fr: 'frFR',
  gr: 'gr',
  he: 'he',
  hi: 'enUS',
  hr: 'hr',
  hu: 'hu',
  hy: 'hy',
  id: 'id',
  is: 'is',
  it: 'it',
  ja: 'jp',
  jp: 'jp',
  ka: 'ka',
  kh: 'kh',
  kk: 'kk',
  km: 'kh',
  ko: 'enUS',
  ky: 'ky',
  lo: 'lo',
  lt: 'lt',
  lv: 'lv',
  mk: 'mk',
  mn: 'mn',
  my: 'my',
  ne: 'ne',
  nl: 'nl',
  no: 'no',
  pl: 'pl',
  pt: 'pt',
  ro: 'ro',
  ru: 'ru',
  se: 'se',
  si: 'si',
  sk: 'sk',
  sl: 'sl',
  sq: 'sq',
  sr: 'sr',
  sv: 'se',
  sw: 'sw',
  th: 'th',
  tl: 'fl',
  tr: 'tr',
  uk: 'uk',
  ur: 'ur',
  uz: 'uz',
  vi: 'vi',
  zh: 'zhTW',
};

Object.entries(languageEntries).forEach(([key, label]) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (GOOGLE_WALLET_BUTTON_BY_LANGUAGE as any)[key] = makeMockSvg(label);
});

describe('AddToWalletButton', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      value: originalPlatform,
      writable: true,
    });
  });

  describe('iOS', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        writable: true,
      });
    });

    it('renders the native AddToWalletButton', () => {
      render(<AddToWalletButton />);

      expect(mockNativeAddToWalletButton).toHaveBeenCalledWith(
        expect.objectContaining({
          buttonStyle: 'blackOutline',
          buttonType: 'basic',
          borderRadius: 4,
        }),
      );
    });

    it('passes onPress to the native button', () => {
      const onPress = jest.fn();
      render(<AddToWalletButton onPress={onPress} />);

      expect(mockNativeAddToWalletButton).toHaveBeenCalledWith(
        expect.objectContaining({ onPress }),
      );
    });

    it('passes custom buttonStyle to the native button', () => {
      render(<AddToWalletButton buttonStyle="black" />);

      expect(mockNativeAddToWalletButton).toHaveBeenCalledWith(
        expect.objectContaining({ buttonStyle: 'black' }),
      );
    });
  });

  describe('Android', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', {
        value: 'android',
        writable: true,
      });
    });

    it('does not render the native button', () => {
      render(<AddToWalletButton />);
      expect(mockNativeAddToWalletButton).not.toHaveBeenCalled();
    });

    it('calls onPress when the button is tapped', () => {
      const onPress = jest.fn();
      const { getByRole } = render(<AddToWalletButton onPress={onPress} />);
      fireEvent.press(getByRole('button'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('has correct accessibility attributes', () => {
      const { getByRole } = render(<AddToWalletButton />);
      const button = getByRole('button');
      expect(button.props.accessibilityLabel).toBe('Add to Google Wallet');
    });
  });

  describe('getGoogleWalletButtonSvg', () => {
    describe('exact region match', () => {
      it.each([
        ['en-AU', 'enAU'],
        ['en-CA', 'enCA'],
        ['en-GB', 'enGB'],
        ['en-IN', 'enIN'],
        ['en-SG', 'enSG'],
        ['en-US', 'enUS'],
        ['en-ZA', 'enZA'],
        ['es-ES', 'esES'],
        ['es-US', 'esUS'],
        ['fr-CA', 'frCA'],
        ['fr-FR', 'frFR'],
        ['zh-HK', 'zhHK'],
        ['zh-TW', 'zhTW'],
      ])('resolves "%s" to %s', (locale, expected) => {
        expect(getGoogleWalletButtonSvg(locale).displayName).toBe(
          `GWB_${expected}`,
        );
      });

      it('handles underscore separator (zh_TW)', () => {
        expect(getGoogleWalletButtonSvg('zh_TW').displayName).toBe('GWB_zhTW');
      });
    });

    describe('base language fallback', () => {
      it.each([
        ['af', 'af'],
        ['am', 'am'],
        ['ar', 'ar'],
        ['az', 'az'],
        ['bg', 'bg'],
        ['bn', 'bn'],
        ['bs', 'bs'],
        ['ca', 'ca'],
        ['de', 'de'],
        ['el', 'gr'],
        ['en', 'enUS'],
        ['es', 'es419'],
        ['et', 'et'],
        ['fa', 'fa'],
        ['fr', 'frFR'],
        ['he', 'he'],
        ['hr', 'hr'],
        ['hu', 'hu'],
        ['hy', 'hy'],
        ['id', 'id'],
        ['is', 'is'],
        ['it', 'it'],
        ['ja', 'jp'],
        ['ka', 'ka'],
        ['kk', 'kk'],
        ['ky', 'ky'],
        ['lo', 'lo'],
        ['lt', 'lt'],
        ['lv', 'lv'],
        ['mk', 'mk'],
        ['mn', 'mn'],
        ['my', 'my'],
        ['ne', 'ne'],
        ['nl', 'nl'],
        ['no', 'no'],
        ['pl', 'pl'],
        ['pt', 'pt'],
        ['ro', 'ro'],
        ['ru', 'ru'],
        ['si', 'si'],
        ['sk', 'sk'],
        ['sl', 'sl'],
        ['sq', 'sq'],
        ['sr', 'sr'],
        ['sw', 'sw'],
        ['th', 'th'],
        ['tl', 'fl'],
        ['tr', 'tr'],
        ['uk', 'uk'],
        ['ur', 'ur'],
        ['uz', 'uz'],
        ['vi', 'vi'],
        ['zh', 'zhTW'],
      ])('resolves "%s" to %s', (locale, expected) => {
        expect(getGoogleWalletButtonSvg(locale).displayName).toBe(
          `GWB_${expected}`,
        );
      });
    });

    describe('ISO aliases', () => {
      it.each([
        ['cs', 'cz'],
        ['da', 'dk'],
        ['sv', 'se'],
        ['be', 'by'],
        ['km', 'kh'],
      ])('maps "%s" to %s', (locale, expected) => {
        expect(getGoogleWalletButtonSvg(locale).displayName).toBe(
          `GWB_${expected}`,
        );
      });
    });

    describe('fallback to English US', () => {
      it('falls back for unsupported locale "xx"', () => {
        const result = getGoogleWalletButtonSvg('xx');
        expect(result).toBeTruthy();
      });

      it('falls back when locale is undefined', () => {
        const result = getGoogleWalletButtonSvg(undefined);
        expect(result).toBeTruthy();
      });

      it.each([
        ['pt-BR', 'pt'],
        ['de-AT', 'de'],
      ])(
        'uses base language for "%s" (no region match)',
        (locale, expected) => {
          expect(getGoogleWalletButtonSvg(locale).displayName).toBe(
            `GWB_${expected}`,
          );
        },
      );
    });
  });

  describe('locale maps completeness', () => {
    it('has all expected region keys', () => {
      const expected = [
        'en_au',
        'en_ca',
        'en_gb',
        'en_in',
        'en_sg',
        'en_us',
        'en_za',
        'es_419',
        'es_es',
        'es_us',
        'fr_ca',
        'fr_fr',
        'zh_hk',
        'zh_tw',
      ];
      expected.forEach((r) => {
        expect(GOOGLE_WALLET_BUTTON_BY_REGION).toHaveProperty(r);
      });
    });

    it('covers all MetaMask app-supported locales', () => {
      const appLocales = [
        'de',
        'el',
        'en',
        'es',
        'fr',
        'id',
        'ja',
        'pt',
        'ru',
        'tl',
        'tr',
        'vi',
        'zh',
      ];
      appLocales.forEach((l) => {
        expect(GOOGLE_WALLET_BUTTON_BY_LANGUAGE).toHaveProperty(l);
      });
    });

    it('every region entry is a function', () => {
      Object.values(GOOGLE_WALLET_BUTTON_BY_REGION).forEach((svg) => {
        expect(typeof svg).toBe('function');
      });
    });

    it('every language entry is a function', () => {
      Object.values(GOOGLE_WALLET_BUTTON_BY_LANGUAGE).forEach((svg) => {
        expect(typeof svg).toBe('function');
      });
    });
  });
});
