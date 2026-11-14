import { resolveInviteTermsLink } from './inviteTermsLink';

const URL = 'https://link.metamask.io/rewards/terms';

describe('resolveInviteTermsLink', () => {
  it('returns the trimmed label and URL when both are set', () => {
    expect(
      resolveInviteTermsLink({
        inviteTermsLearnMore: '  Learn more  ',
        inviteTermsUrl: `  ${URL}  `,
      }),
    ).toEqual({ label: 'Learn more', url: URL });
  });

  it('returns null when the URL is blank', () => {
    expect(
      resolveInviteTermsLink({
        inviteTermsLearnMore: 'Learn more',
        inviteTermsUrl: '',
      }),
    ).toBeNull();
  });

  it('returns null when the label is blank', () => {
    expect(
      resolveInviteTermsLink({
        inviteTermsLearnMore: '   ',
        inviteTermsUrl: URL,
      }),
    ).toBeNull();
  });

  it('returns null when the URL is not https', () => {
    expect(
      resolveInviteTermsLink({
        inviteTermsLearnMore: 'Learn more',
        inviteTermsUrl: 'http://link.metamask.io/rewards/terms',
      }),
    ).toBeNull();
  });

  it('returns null when either key is missing', () => {
    expect(resolveInviteTermsLink({})).toBeNull();
    expect(resolveInviteTermsLink(undefined)).toBeNull();
    expect(resolveInviteTermsLink(null)).toBeNull();
  });
});
