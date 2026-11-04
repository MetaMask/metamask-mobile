import { isViewerSocialAuthor } from './isViewerSocialAuthor';

describe('isViewerSocialAuthor', () => {
  it('returns true when the author and viewer profile ids match', () => {
    const result = isViewerSocialAuthor('viewer-1', 'viewer-1');

    expect(result).toBe(true);
  });

  it('returns false when the author and viewer profile ids differ', () => {
    const result = isViewerSocialAuthor('author-1', 'viewer-1');

    expect(result).toBe(false);
  });

  it('returns false when the viewer profile id is unavailable', () => {
    const result = isViewerSocialAuthor('author-1', undefined);

    expect(result).toBe(false);
  });
});
