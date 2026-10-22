import {
  clipComposerComment,
  commentContainsUrl,
  COMPOSER_COMMENT_MAX_LENGTH,
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
  });

  describe('clipComposerComment', () => {
    it('truncates text past the character limit', () => {
      const input = 'a'.repeat(COMPOSER_COMMENT_MAX_LENGTH + 10);

      expect(clipComposerComment(input)).toHaveLength(
        COMPOSER_COMMENT_MAX_LENGTH,
      );
    });
  });
});
