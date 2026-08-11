import AppConstants from '../../../../core/AppConstants';
import {
  CARD_SUPPORT_EMAIL,
  CRB_ACCOUNT_OPENING_URL,
  CRB_PRIVACY_NOTICE_URL,
  CRB_TERMS_URL,
} from '../constants';
import type { RegistrationSettingsResponse } from '../types';
import {
  getCardSupportEmail,
  getCardTermsAndConditionsUrl,
  getCardUsDisclosureUrls,
  toOpenableUrl,
} from './registrationSettings';

const US_TERMS_URL = 'https://docs.baanx.us/metamask/terms.pdf';
const INTL_TERMS_URL = 'https://www.baanxuk.com/docs/terms.pdf';
const US_SUPPORT_EMAIL = 'us-support@cl-cards.com';
const INTL_SUPPORT_EMAIL = 'intl-support@cl-cards.com';

const createRegistrationSettings = ({
  usTermsAndConditions = US_TERMS_URL,
  intlTermsAndConditions = INTL_TERMS_URL,
  accountOpeningDisclosure = 'https://docs.baanx.us/metamask/account-opening.pdf',
  noticeOfPrivacy = 'https://docs.baanx.us/metamask/privacy.pdf',
  eSignConsentDisclosure = 'https://docs.baanx.us/metamask/esign.pdf',
  usSupportEmail = US_SUPPORT_EMAIL,
  intlSupportEmail = INTL_SUPPORT_EMAIL,
}: {
  usTermsAndConditions?: string;
  intlTermsAndConditions?: string;
  accountOpeningDisclosure?: string;
  noticeOfPrivacy?: string;
  eSignConsentDisclosure?: string;
  usSupportEmail?: string;
  intlSupportEmail?: string;
} = {}): RegistrationSettingsResponse => ({
  countries: [],
  usStates: [],
  links: {
    us: {
      termsAndConditions: usTermsAndConditions,
      accountOpeningDisclosure,
      noticeOfPrivacy,
      eSignConsentDisclosure,
    },
    intl: {
      termsAndConditions: intlTermsAndConditions,
      rightToInformation: '',
    },
  },
  config: {
    us: {
      emailSpecialCharactersDomainsException: '',
      consentSmsNumber: '',
      supportEmail: usSupportEmail,
    },
    intl: {
      emailSpecialCharactersDomainsException: '',
      consentSmsNumber: '',
      supportEmail: intlSupportEmail,
    },
  },
});

describe('toOpenableUrl', () => {
  it('returns null for blank values', () => {
    const result = toOpenableUrl('   ');

    expect(result).toBeNull();
  });

  it('trims valid http URLs', () => {
    const result = toOpenableUrl('  https://docs.example.com/terms.pdf  ');

    expect(result).toBe('https://docs.example.com/terms.pdf');
  });

  it('prefixes https for scheme-less domain URLs', () => {
    const result = toOpenableUrl('www.baanxuk.com/docs/terms.pdf');

    expect(result).toBe('https://www.baanxuk.com/docs/terms.pdf');
  });

  it('returns null for placeholder values', () => {
    const result = toOpenableUrl('Not currently available');

    expect(result).toBeNull();
  });
});

describe('getCardTermsAndConditionsUrl', () => {
  it('returns the US terms URL for US users', () => {
    const settings = createRegistrationSettings();

    const result = getCardTermsAndConditionsUrl(settings, 'us');

    expect(result).toBe(US_TERMS_URL);
  });

  it('returns the international terms URL for international users', () => {
    const settings = createRegistrationSettings();

    const result = getCardTermsAndConditionsUrl(settings, 'international');

    expect(result).toBe(INTL_TERMS_URL);
  });

  it('falls back to the static TOS URL when the selected URL is blank', () => {
    const settings = createRegistrationSettings({
      intlTermsAndConditions: '   ',
    });

    const result = getCardTermsAndConditionsUrl(settings, 'international');

    expect(result).toBe(AppConstants.CARD.CARD_TOS_URL);
  });

  it('falls back to the static TOS URL when settings are missing', () => {
    const result = getCardTermsAndConditionsUrl(null, 'us');

    expect(result).toBe(AppConstants.CARD.CARD_TOS_URL);
  });
});

describe('getCardSupportEmail', () => {
  it('returns the US support email for US users', () => {
    const settings = createRegistrationSettings();

    const result = getCardSupportEmail(settings, 'us');

    expect(result).toBe(US_SUPPORT_EMAIL);
  });

  it('returns the international support email for international users', () => {
    const settings = createRegistrationSettings();

    const result = getCardSupportEmail(settings, 'international');

    expect(result).toBe(INTL_SUPPORT_EMAIL);
  });

  it('falls back to the static support email when the selected email is blank', () => {
    const settings = createRegistrationSettings({ usSupportEmail: '   ' });

    const result = getCardSupportEmail(settings, 'us');

    expect(result).toBe(CARD_SUPPORT_EMAIL);
  });
});

describe('getCardUsDisclosureUrls', () => {
  it('returns dynamic US disclosure URLs when settings include openable URLs', () => {
    const settings = createRegistrationSettings();

    const result = getCardUsDisclosureUrls(settings);

    expect(result).toStrictEqual({
      eSignConsentDisclosureUSUrl: 'https://docs.baanx.us/metamask/esign.pdf',
      crbTermsUrl: US_TERMS_URL,
      crbAccountOpeningUrl:
        'https://docs.baanx.us/metamask/account-opening.pdf',
      crbNoticeOfPrivacyUrl: 'https://docs.baanx.us/metamask/privacy.pdf',
    });
  });

  it('falls back to static CRB URLs when dynamic disclosure URLs are not openable', () => {
    const settings = createRegistrationSettings({
      usTermsAndConditions: 'pending URL update',
      accountOpeningDisclosure: '',
      noticeOfPrivacy: 'N/A',
      eSignConsentDisclosure: '',
    });

    const result = getCardUsDisclosureUrls(settings);

    expect(result).toStrictEqual({
      eSignConsentDisclosureUSUrl: '',
      crbTermsUrl: CRB_TERMS_URL,
      crbAccountOpeningUrl: CRB_ACCOUNT_OPENING_URL,
      crbNoticeOfPrivacyUrl: CRB_PRIVACY_NOTICE_URL,
    });
  });
});
