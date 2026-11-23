import {
  commentContainsUrl,
  countCommentWords,
  isComposerCommentValid,
} from './commentValidation';

describe('commentValidation', () => {
  describe('countCommentWords', () => {
    it('counts whitespace-separated words', () => {
      expect(countCommentWords('  this is a thought  ')).toBe(4);
    });

    it('returns 0 for empty text', () => {
      expect(countCommentWords('   ')).toBe(0);
    });
  });

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
    it('returns false when there are fewer than three words', () => {
      expect(isComposerCommentValid('hello world')).toBe(false);
    });

    it('returns false when the text contains a url', () => {
      expect(isComposerCommentValid('this is https://phish.test')).toBe(false);
    });

    it('returns true for three words within the limit', () => {
      expect(isComposerCommentValid('this is alpha')).toBe(true);
    });

    it('returns false for empty text', () => {
      expect(isComposerCommentValid('')).toBe(false);
    });

    it('returns true when the text is 3000 characters', () => {
      const text = `alpha beta ${'g'.repeat(3000 - 'alpha beta '.length)}`;

      expect(text).toHaveLength(3000);
      expect(isComposerCommentValid(text)).toBe(true);
    });

    it('returns true for 3000 characters of emoji, counting each emoji as one', () => {
      const text = `${'😀'.repeat(2_994)} a b c`;

      expect(text).toHaveLength(5_994);
      expect(isComposerCommentValid(text)).toBe(true);
    });

    it('returns true for 3000 Korean characters', () => {
      const text = `${'가'.repeat(2_995)} 끝 ok`;

      expect(text).toHaveLength(3_000);
      expect(isComposerCommentValid(text)).toBe(true);
    });

    it('returns false for 3001 characters of emoji', () => {
      const text = `${'😀'.repeat(2_995)} a b c`;

      expect(isComposerCommentValid(text)).toBe(false);
    });

    it('returns false when the text is longer than 3000 characters', () => {
      const text = `alpha beta ${'g'.repeat(3001 - 'alpha beta '.length)}`;

      expect(isComposerCommentValid(text)).toBe(false);
    });
  });
});
