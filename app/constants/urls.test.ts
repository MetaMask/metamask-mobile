import { buildVipPrioritySupportUrl, METAMASK_SUPPORT_URL } from './urls';

describe('buildVipPrioritySupportUrl', () => {
  it('appends VIP priority and account query params to the default support URL', () => {
    const account = '0xAbC0000000000000000000000000000000000123';

    expect(buildVipPrioritySupportUrl(account)).toBe(
      `${METAMASK_SUPPORT_URL}&priority=vip&account=${encodeURIComponent(account)}`,
    );
  });

  it('uses ? as the separator when the base URL has no query string', () => {
    const baseUrl = 'https://support.metamask.io/';

    expect(buildVipPrioritySupportUrl('0xabc', baseUrl)).toBe(
      `${baseUrl}?priority=vip&account=0xabc`,
    );
  });

  it('uses & as the separator when the base URL already has query params', () => {
    const baseUrl = 'https://support.metamask.io/?utm_source=mobile_app';

    expect(buildVipPrioritySupportUrl('0xabc', baseUrl)).toBe(
      `${baseUrl}&priority=vip&account=0xabc`,
    );
  });

  it('URL-encodes the account address', () => {
    const account = '0xabc&foo=bar?baz';

    expect(
      buildVipPrioritySupportUrl(account, 'https://support.example.com'),
    ).toBe(
      `https://support.example.com?priority=vip&account=${encodeURIComponent(account)}`,
    );
  });
});
