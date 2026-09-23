import { isNewHomepageClipboardContent } from './useHomepageSearchPaste';

describe('isNewHomepageClipboardContent', () => {
  it('accepts non-empty clipboard content', () => {
    expect(isNewHomepageClipboardContent('0xabc')).toBe(true);
  });

  it('rejects empty clipboard content', () => {
    expect(isNewHomepageClipboardContent('')).toBe(false);
  });
});
