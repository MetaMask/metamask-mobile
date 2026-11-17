import { preferTraderAvatarUrl } from './preferTraderAvatarUrl';

describe('preferTraderAvatarUrl', () => {
  it('prefers a live profile photo over a list snapshot', () => {
    expect(
      preferTraderAvatarUrl(
        'https://cdn.example/live.png',
        'https://cdn.example/list.png',
      ),
    ).toBe('https://cdn.example/live.png');
  });

  it('falls back to the list snapshot when live is missing', () => {
    expect(preferTraderAvatarUrl(null, 'https://cdn.example/list.png')).toBe(
      'https://cdn.example/list.png',
    );
  });

  it('skips the shared ENS placeholder so Maskicon can render', () => {
    expect(
      preferTraderAvatarUrl(
        'https://daylight-images.s3.us-east-1.amazonaws.com/ens-fallback.png',
        undefined,
      ),
    ).toBeUndefined();
  });
});
