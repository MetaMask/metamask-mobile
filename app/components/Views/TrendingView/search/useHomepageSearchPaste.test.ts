import { isNewHomepageClipboardRevision } from './useHomepageSearchPaste';

describe('isNewHomepageClipboardRevision', () => {
  it('accepts clipboard content when the native clipboard has a string', () => {
    expect(isNewHomepageClipboardRevision(true, 1)).toBe(true);
  });

  it('rejects empty clipboard content', () => {
    expect(isNewHomepageClipboardRevision(false, 1)).toBe(false);
  });
});
