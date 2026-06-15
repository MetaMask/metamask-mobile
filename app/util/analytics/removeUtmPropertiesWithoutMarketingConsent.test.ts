import { removeUtmPropertiesWithoutMarketingConsent } from './removeUtmPropertiesWithoutMarketingConsent';

describe('removeUtmPropertiesWithoutMarketingConsent', () => {
  it('returns properties unchanged when marketing consent is granted', () => {
    const properties = {
      wallet_setup_type: 'new',
      utm_source: 'install',
    };

    expect(
      removeUtmPropertiesWithoutMarketingConsent(properties, true),
    ).toEqual(properties);
  });

  it('strips utm and attribution_id when marketing consent is not granted', () => {
    const properties = {
      wallet_setup_type: 'new',
      utm_source: 'install',
      utm_campaign: 'spring',
      attribution_id: 'abc',
    };

    expect(
      removeUtmPropertiesWithoutMarketingConsent(properties, false),
    ).toEqual({
      wallet_setup_type: 'new',
    });
  });

  it('returns undefined properties unchanged', () => {
    expect(
      removeUtmPropertiesWithoutMarketingConsent(undefined, false),
    ).toBeUndefined();
  });
});
