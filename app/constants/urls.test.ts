import { buildVipPrioritySupportUrl, METAMASK_SUPPORT_URL } from './urls';

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
