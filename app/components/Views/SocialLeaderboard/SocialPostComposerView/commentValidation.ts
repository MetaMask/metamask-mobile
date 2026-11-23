export const COMPOSER_COMMENT_MAX_LENGTH = 3000;
export const COMPOSER_COMMENT_MIN_WORDS = 3;

/**
 * Counts Unicode code points, not UTF-16 code units: most emoji and every
 * Korean syllable are one, while a combined emoji such as a flag or a family
 * counts as several. The server counts the same way, so both reject the same
 * text.
 */
export const countComposerCharacters = (text: string): number =>
  Array.from(text).length;

const URL_PATTERN =
  /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z]{2,})+\b/i;

export const countCommentWords = (text: string): number =>
  text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

export const commentContainsUrl = (text: string): boolean =>
  URL_PATTERN.test(text);

export const isComposerCommentValid = (text: string): boolean => {
  const trimmed = text.trim();
  if (
    trimmed.length === 0 ||
    countComposerCharacters(trimmed) > COMPOSER_COMMENT_MAX_LENGTH
  ) {
    return false;
  }
  if (countCommentWords(trimmed) < COMPOSER_COMMENT_MIN_WORDS) {
    return false;
  }
  return !commentContainsUrl(trimmed);
};
