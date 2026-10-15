import { hasRealAvatar } from './avatarFallback';

describe('hasRealAvatar', () => {
  it('returns false for null, undefined, and empty string', () => {
    expect(hasRealAvatar(null)).toBe(false);
    expect(hasRealAvatar(undefined)).toBe(false);
    expect(hasRealAvatar('')).toBe(false);
  });

  it('returns false for the known ENS fallback placeholder', () => {
    expect(
      hasRealAvatar(
        'https://daylight-images.s3.us-east-1.amazonaws.com/ens-fallback.png',
      ),
    ).toBe(false);
  });

  it('returns true for real Clicker-hosted avatar URLs', () => {
    expect(
      hasRealAvatar(
        'https://clicker.api.cx.metamask.io/avatar/eyJpbWFnZUlkIjoxMjY0NDk3fQ',
      ),
    ).toBe(true);
  });

  it('returns true for any non-default URL', () => {
    expect(hasRealAvatar('https://example.com/avatar.png')).toBe(true);
  });
});
