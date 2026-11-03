import {
  commentContainsUrl,
  isComposerCommentValid,
} from './commentValidation';

describe('commentValidation', () => {
  describe('commentContainsUrl', () => {
    it('returns true for http links', () => {
      expect(commentContainsUrl('see https://example.com now')).toBe(true);
    });

    it('returns true for www links', () => {
      expect(commentContainsUrl('see www.example.com now')).toBe(true);
    });

    it('returns true for a bare domain', () => {
      expect(commentContainsUrl('visit example.com today')).toBe(true);
    });

    it('returns false when there is no url', () => {
      expect(commentContainsUrl('this is a thought')).toBe(false);
    });
  });

  describe('isComposerCommentValid', () => {
    it('returns true for a short caption', () => {
      expect(isComposerCommentValid('hello world')).toBe(true);
    });

    it('returns false when the text contains a url', () => {
      expect(isComposerCommentValid('this is https://phish.test')).toBe(false);
    });

    it('returns false for a bare domain', () => {
      expect(isComposerCommentValid('visit example.com today')).toBe(false);
    });

    it('returns true for three words within the limit', () => {
      expect(isComposerCommentValid('this is alpha')).toBe(true);
    });

    it('returns false for empty text', () => {
      expect(isComposerCommentValid('')).toBe(false);
    });

    it('returns false when the text is longer than 250 characters', () => {
      expect(isComposerCommentValid(`${'alpha '.repeat(50)}end`)).toBe(false);
    });
  });
});
