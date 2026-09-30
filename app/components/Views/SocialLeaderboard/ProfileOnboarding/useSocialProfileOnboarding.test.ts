import { parseXAuthCallback } from './useSocialProfileOnboarding';

describe('parseXAuthCallback', () => {
  it('reads the OAuth code and state', () => {
    expect(
      parseXAuthCallback('metamask://profile/x?code=abc&state=pkce-state'),
    ).toEqual({ code: 'abc', state: 'pkce-state' });
  });

  it('ignores URLs that are not an X redirect', () => {
    expect(parseXAuthCallback('metamask://social')).toBeNull();
    expect(parseXAuthCallback('not a url')).toBeNull();
  });
});
