import {
  MONEY_SHARE_HOME_REF_BASE,
  resolveMoneyShareUrl,
} from './moneyShareUrl';

describe('resolveMoneyShareUrl', () => {
  it('prefers share_url from the API over the code, including a template that is not /home?ref=', () => {
    expect(
      resolveMoneyShareUrl(
        'ABC123',
        'https://link.metamask.io/join?code=VANITY',
      ),
    ).toBe('https://link.metamask.io/join?code=VANITY');
  });

  it('passes through a share_url on a host the client does not hard-code', () => {
    expect(
      resolveMoneyShareUrl('ABC123', 'https://example.test/r?ref=ABC123'),
    ).toBe('https://example.test/r?ref=ABC123');
  });

  it('builds the home ref link from the code when share_url is null', () => {
    expect(resolveMoneyShareUrl('ABC123', null)).toBe(
      'https://link.metamask.io/home?ref=ABC123',
    );
  });

  it.each([undefined, '', '   '])(
    'treats %p as no share_url and falls back to the code',
    (shareUrl) => {
      expect(resolveMoneyShareUrl('ABC123', shareUrl)).toBe(
        'https://link.metamask.io/home?ref=ABC123',
      );
    },
  );

  it('percent-encodes a code that is not URL safe', () => {
    expect(resolveMoneyShareUrl('a b&c=1', null)).toBe(
      `${MONEY_SHARE_HOME_REF_BASE}a%20b%26c%3D1`,
    );
  });

  it.each([null, undefined, '', '   '])(
    'returns null when there is no code and no usable share_url (%p)',
    (code) => {
      expect(resolveMoneyShareUrl(code, null)).toBeNull();
    },
  );

  it('does not rewrite a points-shaped share_url the API sent', () => {
    expect(
      resolveMoneyShareUrl(
        'ABC123',
        'https://link.metamask.io/rewards?referral=ABC123',
      ),
    ).toBe('https://link.metamask.io/rewards?referral=ABC123');
  });

  it('never emits the points referral path from the code fallback', () => {
    const url = resolveMoneyShareUrl('ABC123', null);

    expect(url).not.toContain('rewards?referral=');
    expect(url).toContain('/home?ref=');
  });

  it.each([
    ['a non-https scheme', `javascript:${'alert(1)'}`],
    ['a data url', 'data:text/html,<script/>'],
    ['an unparseable value', 'not a url at all'],
    [
      'a host smuggled into the userinfo',
      'https://evil.com@link.metamask.io/home?ref=ABC',
    ],
    [
      'credentials in front of the host',
      'https://user:pass@link.metamask.io/home?ref=ABC',
    ],
    [
      'an empty password after a username',
      'https://user:@link.metamask.io/home?ref=ABC',
    ],
    [
      'the link host in the userinfo',
      'https://link.metamask.io@evil.com/home?ref=ABC',
    ],
  ])('ignores %s and falls back to the code', (_case, shareUrl) => {
    expect(resolveMoneyShareUrl('ABC123', shareUrl)).toBe(
      'https://link.metamask.io/home?ref=ABC123',
    );
  });

  it('returns null rather than sharing a share_url it cannot treat as http(s)', () => {
    expect(resolveMoneyShareUrl(null, `javascript:${'alert(1)'}`)).toBeNull();
  });

  it('returns null rather than sharing a share_url carrying credentials', () => {
    expect(
      resolveMoneyShareUrl(
        null,
        'https://evil.com@link.metamask.io/home?ref=ABC',
      ),
    ).toBeNull();
  });

  it('keeps extra query parameters on a share_url', () => {
    expect(
      resolveMoneyShareUrl(
        'ABC123',
        'https://link.metamask.io/home?ref=ABC123&utm_source=app',
      ),
    ).toBe('https://link.metamask.io/home?ref=ABC123&utm_source=app');
  });

  it('trims a share_url before using it', () => {
    expect(
      resolveMoneyShareUrl(
        'ABC123',
        '  https://link.metamask.io/join?code=ABC123  ',
      ),
    ).toBe('https://link.metamask.io/join?code=ABC123');
  });
});
