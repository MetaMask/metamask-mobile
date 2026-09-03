import {
  getOnboardingLegalDocuments,
  getPermanentLegalDocuments,
  getRegionByCode,
} from './immersveLegalDocuments';
import type { CardApiSupportedRegionsResponse } from '../../../../core/Engine/controllers/card-controller/services/card-supported-regions.types';

const GB_DOCUMENTS = {
  generalTermsOfUse: {
    title: 'General Terms of Use',
    url: 'https://example.com/gb/terms',
  },
  privacyPolicy: {
    title: 'Privacy Policy',
    url: 'https://example.com/gb/privacy',
  },
  disclosures: [
    {
      title: 'Product Disclosure',
      url: 'https://example.com/gb/disclosure-0',
    },
  ],
  marketCompliance: [
    {
      title: 'Market Compliance',
      url: 'https://example.com/gb/market-0',
    },
  ],
};

const RESPONSE: CardApiSupportedRegionsResponse = {
  provider: 'immersve',
  regions: [
    {
      code: 'GB',
      name: 'United Kingdom',
      isAvailable: true,
      unstructuredAddressAllowed: false,
      documents: GB_DOCUMENTS,
    },
    {
      code: 'AU',
      name: 'Australia',
      isAvailable: true,
      unstructuredAddressAllowed: false,
      documents: {
        generalTermsOfUse: {
          title: 'AU Terms',
          url: 'https://example.com/au/terms',
        },
        privacyPolicy: {
          title: 'AU Privacy',
          url: 'https://example.com/au/privacy',
        },
        disclosures: [],
        marketCompliance: [],
      },
    },
  ],
};

describe('getRegionByCode', () => {
  it('returns region matching code case-insensitively', () => {
    expect(getRegionByCode(RESPONSE, 'gb')?.code).toBe('GB');
    expect(getRegionByCode(RESPONSE, 'AU')?.name).toBe('Australia');
  });

  it('returns null when code is missing from response', () => {
    expect(getRegionByCode(RESPONSE, 'US')).toBeNull();
  });

  it('returns null when response or code is empty', () => {
    expect(getRegionByCode(null, 'GB')).toBeNull();
    expect(getRegionByCode(RESPONSE, null)).toBeNull();
    expect(getRegionByCode(RESPONSE, '')).toBeNull();
  });
});

describe('getOnboardingLegalDocuments', () => {
  it('returns terms, privacy, and disclosures in order', () => {
    expect(getOnboardingLegalDocuments(GB_DOCUMENTS)).toStrictEqual([
      {
        id: 'generalTermsOfUse',
        title: 'General Terms of Use',
        url: 'https://example.com/gb/terms',
      },
      {
        id: 'privacyPolicy',
        title: 'Privacy Policy',
        url: 'https://example.com/gb/privacy',
      },
      {
        id: 'disclosure-0',
        title: 'Product Disclosure',
        url: 'https://example.com/gb/disclosure-0',
      },
    ]);
  });

  it('excludes marketCompliance from onboarding set', () => {
    const ids = getOnboardingLegalDocuments(GB_DOCUMENTS).map((d) => d.id);

    expect(ids).not.toContain('marketCompliance-0');
  });

  it('skips documents missing title or url', () => {
    expect(
      getOnboardingLegalDocuments({
        generalTermsOfUse: { title: '', url: 'https://example.com/t' },
        privacyPolicy: { title: 'Privacy', url: '' },
        disclosures: [{ title: 'Ok', url: 'https://example.com/d' }],
        marketCompliance: [],
      }),
    ).toStrictEqual([
      {
        id: 'disclosure-0',
        title: 'Ok',
        url: 'https://example.com/d',
      },
    ]);
  });

  it('returns empty array when documents are missing', () => {
    expect(getOnboardingLegalDocuments(undefined)).toStrictEqual([]);
    expect(getOnboardingLegalDocuments(null)).toStrictEqual([]);
  });
});

describe('getPermanentLegalDocuments', () => {
  it('returns onboarding docs plus marketCompliance', () => {
    expect(getPermanentLegalDocuments(GB_DOCUMENTS)).toStrictEqual([
      {
        id: 'generalTermsOfUse',
        title: 'General Terms of Use',
        url: 'https://example.com/gb/terms',
      },
      {
        id: 'privacyPolicy',
        title: 'Privacy Policy',
        url: 'https://example.com/gb/privacy',
      },
      {
        id: 'disclosure-0',
        title: 'Product Disclosure',
        url: 'https://example.com/gb/disclosure-0',
      },
      {
        id: 'marketCompliance-0',
        title: 'Market Compliance',
        url: 'https://example.com/gb/market-0',
      },
    ]);
  });

  it('returns empty array when documents are missing', () => {
    expect(getPermanentLegalDocuments(undefined)).toStrictEqual([]);
  });
});
