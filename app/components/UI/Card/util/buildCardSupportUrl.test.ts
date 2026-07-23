import { buildCardSupportUrl } from './buildCardSupportUrl';

describe('buildCardSupportUrl', () => {
  const baseUrl = 'https://support.metamask.io/?utm_source=mobile_app';

  it('appends all context params when provided', () => {
    const result = buildCardSupportUrl(baseUrl, {
      walletAddress: '0xabc',
      cardState: 'active',
      provider: 'immersve',
      isMoneyAccount: true,
    });

    expect(result).toBe(
      `${baseUrl}&wallet=0xabc&cardState=active&provider=immersve&moneyAccount=true`,
    );
  });

  it('uses ? when the base URL has no query string', () => {
    const result = buildCardSupportUrl(
      'https://intercom.help/internal-beta-testing/en/',
      {
        provider: 'baanx',
      },
    );

    expect(result).toBe(
      'https://intercom.help/internal-beta-testing/en/?provider=baanx',
    );
  });

  it('omits undefined optional values', () => {
    const result = buildCardSupportUrl(baseUrl, {
      provider: 'baanx',
      isMoneyAccount: false,
    });

    expect(result).toBe(`${baseUrl}&provider=baanx&moneyAccount=false`);
    expect(result).not.toContain('wallet=');
    expect(result).not.toContain('cardState=');
  });

  it('returns the base URL unchanged when no context is provided', () => {
    const result = buildCardSupportUrl(baseUrl);

    expect(result).toBe(baseUrl);
  });

  it('encodes special characters in wallet address', () => {
    const result = buildCardSupportUrl(baseUrl, {
      walletAddress: 'solana:abc/def',
    });

    expect(result).toContain('wallet=solana%3Aabc%2Fdef');
  });
});
