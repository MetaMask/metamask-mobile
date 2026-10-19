import {
  buildCardSupportUrl,
  buildVipPrioritySupportUrl,
  METAMASK_SUPPORT_URL,
} from './urls';

describe('buildVipPrioritySupportUrl', () => {
  it('appends VIP priority and address query params to the default support URL', () => {
    const account = '0xAbC0000000000000000000000000000000000123';

    expect(buildVipPrioritySupportUrl(account)).toBe(
      `${METAMASK_SUPPORT_URL}&priority=vip&address=${encodeURIComponent(account)}`,
    );
  });

  it('uses ? as the separator when the base URL has no query string', () => {
    const baseUrl = 'https://support.metamask.io/';

    expect(buildVipPrioritySupportUrl('0xabc', baseUrl)).toBe(
      `${baseUrl}?priority=vip&address=0xabc`,
    );
  });

  it('uses & as the separator when the base URL already has query params', () => {
    const baseUrl = 'https://support.metamask.io/?utm_source=mobile_app';

    expect(buildVipPrioritySupportUrl('0xabc', baseUrl)).toBe(
      `${baseUrl}&priority=vip&address=0xabc`,
    );
  });

  it('URL-encodes the wallet address', () => {
    const account = '0xabc&foo=bar?baz';

    expect(
      buildVipPrioritySupportUrl(account, 'https://support.example.com'),
    ).toBe(
      `https://support.example.com?priority=vip&address=${encodeURIComponent(account)}`,
    );
  });
});

describe('buildCardSupportUrl', () => {
  it('appends the provider identity to the default support URL', () => {
    expect(
      buildCardSupportUrl({
        providerUserId: 'cardholder-1',
        providerName: 'immersve',
      }),
    ).toBe(
      `${METAMASK_SUPPORT_URL}&provider_user_id=cardholder-1&provider_name=immersve`,
    );
  });

  it('uses ? as the separator when the base URL has no query string', () => {
    expect(
      buildCardSupportUrl(
        { providerUserId: 'cardholder-1', providerName: 'baanx' },
        'https://intercom.help/internal-beta-testing/en/',
      ),
    ).toBe(
      'https://intercom.help/internal-beta-testing/en/?provider_user_id=cardholder-1&provider_name=baanx',
    );
  });

  it('omits the provider user id when it is unknown', () => {
    expect(
      buildCardSupportUrl(
        { providerUserId: null, providerName: 'immersve' },
        'https://support.example.com',
      ),
    ).toBe('https://support.example.com?provider_name=immersve');
  });

  it('returns the base URL untouched when the provider identity is unknown', () => {
    expect(
      buildCardSupportUrl(
        { providerUserId: null, providerName: null },
        'https://support.example.com',
      ),
    ).toBe('https://support.example.com');
  });

  it('URL-encodes the provider params', () => {
    expect(
      buildCardSupportUrl(
        { providerUserId: 'user&id=1', providerName: 'a b' },
        'https://support.example.com',
      ),
    ).toBe(
      `https://support.example.com?provider_user_id=${encodeURIComponent('user&id=1')}&provider_name=${encodeURIComponent('a b')}`,
    );
  });
});
