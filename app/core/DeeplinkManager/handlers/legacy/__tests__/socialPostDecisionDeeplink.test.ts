import {
  parseSocialPostDecisionParams,
  SOCIAL_POST_DECISION_MAX_HANDLE_LENGTH,
  SOCIAL_POST_DECISION_MAX_REASON_LENGTH,
  SOCIAL_POST_DECISION_MAX_TEXT_LENGTH,
} from '../socialPostDecisionDeeplink';

const REQUIRED = 'handle=alphawhale&text=hello&reason=spam';

describe('parseSocialPostDecisionParams', () => {
  it('returns only the required fields when the link has no optional ones', () => {
    expect(
      parseSocialPostDecisionParams(`/social/post/decision?${REQUIRED}`),
    ).toStrictEqual({
      kind: 'post-removed',
      handle: 'alphawhale',
      text: 'hello',
      reason: 'spam',
      postedAt: undefined,
      reportedAt: undefined,
      decidedAt: undefined,
      avatarUrl: undefined,
      profileId: undefined,
      verified: false,
    });
  });

  it.each([
    'post-removed',
    'profile-hidden',
    'report-post-removed',
    'report-post-left-up',
    'report-profile-hidden',
    'report-profile-left-up',
  ])('reads the %s kind', (kind) => {
    expect(
      parseSocialPostDecisionParams(
        `/social/post/decision?kind=${kind}&${REQUIRED}`,
      )?.kind,
    ).toBe(kind);
  });

  it('returns undefined for an unknown kind', () => {
    expect(
      parseSocialPostDecisionParams(
        `/social/post/decision?kind=banned&${REQUIRED}`,
      ),
    ).toBeUndefined();
  });

  it.each([
    'profile-hidden',
    'report-profile-hidden',
    'report-profile-left-up',
  ])('does not need the post text to describe the %s kind', (kind) => {
    expect(
      parseSocialPostDecisionParams(
        `/social/post/decision?kind=${kind}&handle=alphawhale&reason=Impersonation`,
      ),
    ).toMatchObject({ kind, handle: 'alphawhale', text: undefined });
  });

  it.each(['post-removed', 'report-post-removed', 'report-post-left-up'])(
    'reads the %s kind of a position-only post, which has no text',
    (kind) => {
      expect(
        parseSocialPostDecisionParams(
          `/social/post/decision?kind=${kind}&handle=alphawhale&reason=spam`,
        ),
      ).toMatchObject({ kind, handle: 'alphawhale', text: undefined });
    },
  );

  it('reads when the report was filed and when the decision was made', () => {
    expect(
      parseSocialPostDecisionParams(
        `/social/post/decision?kind=report-post-removed&${REQUIRED}&reportedAt=1763380800000&decidedAt=1763467200000`,
      ),
    ).toMatchObject({
      reportedAt: 1763380800000,
      decidedAt: 1763467200000,
    });
  });

  it('trims the text it reads', () => {
    const decision = parseSocialPostDecisionParams(
      '/social/post/decision?handle=%20alphawhale%20&text=%20hello%20&reason=%20spam%20',
    );

    expect(decision).toMatchObject({
      handle: 'alphawhale',
      text: 'hello',
      reason: 'spam',
    });
  });

  it.each([
    ['handle', `text=hello&reason=spam`],
    ['reason', `handle=alphawhale&text=hello`],
    ['handle', `handle=%20%20&text=hello&reason=spam`],
  ])('returns undefined without a usable %s', (_, query) => {
    expect(
      parseSocialPostDecisionParams(`/social/post/decision?${query}`),
    ).toBeUndefined();
  });

  it('returns undefined for a path with no query string', () => {
    expect(
      parseSocialPostDecisionParams('/social/post/decision'),
    ).toBeUndefined();
  });

  it('caps how much text a link can put on screen', () => {
    const decision = parseSocialPostDecisionParams(
      `/social/post/decision?handle=${'h'.repeat(500)}&text=${'t'.repeat(5000)}&reason=${'r'.repeat(5000)}`,
    );

    expect(decision?.handle).toHaveLength(
      SOCIAL_POST_DECISION_MAX_HANDLE_LENGTH,
    );
    expect(decision?.text).toHaveLength(SOCIAL_POST_DECISION_MAX_TEXT_LENGTH);
    expect(decision?.reason).toHaveLength(
      SOCIAL_POST_DECISION_MAX_REASON_LENGTH,
    );
  });

  it.each([
    ['https://example.com/a.png', 'https://example.com/a.png'],
    ['foxicon://fox/blue', 'foxicon://fox/blue'],
    ['http://example.com/a.png', undefined],
    // Built at runtime so the source has no literal javascript: URL (no-script-url).
    [`${'javascript'}:alert(1)`, undefined],
    ['file:///etc/passwd', undefined],
  ])('accepts avatar %s as %s', (avatarUrl, expected) => {
    const decision = parseSocialPostDecisionParams(
      `/social/post/decision?${REQUIRED}&avatarUrl=${encodeURIComponent(avatarUrl)}`,
    );

    expect(decision?.avatarUrl).toBe(expected);
  });

  it.each([
    ['1763460000000', 1763460000000],
    ['8640000000000000', 8640000000000000],
    ['8640000000000001', undefined],
    ['9007199254740991', undefined],
    ['abc', undefined],
    ['-5', undefined],
    ['0', undefined],
    ['1.5', undefined],
    ['', undefined],
  ])('reads timestamp %p as %p', (value, expected) => {
    const decision = parseSocialPostDecisionParams(
      `/social/post/decision?${REQUIRED}&postedAt=${value}`,
    );

    expect(decision?.postedAt).toBe(expected);
  });

  it('shows the verified badge only for an explicit true', () => {
    const verified = (value: string) =>
      parseSocialPostDecisionParams(
        `/social/post/decision?${REQUIRED}&verified=${value}`,
      )?.verified;

    expect(verified('true')).toBe(true);
    expect(verified('false')).toBe(false);
    expect(verified('1')).toBe(false);
  });
});
