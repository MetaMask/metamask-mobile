export const COMPOSER_COMMENT_MAX_LENGTH = 250;
export const COMPOSER_COMMENT_MIN_WORDS = 3;

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
  if (trimmed.length === 0 || trimmed.length > COMPOSER_COMMENT_MAX_LENGTH) {
    return false;
  }
  if (countCommentWords(trimmed) < COMPOSER_COMMENT_MIN_WORDS) {
    return false;
  }
  return !commentContainsUrl(trimmed);
};

export const clipComposerComment = (text: string): string =>
  text.slice(0, COMPOSER_COMMENT_MAX_LENGTH);
