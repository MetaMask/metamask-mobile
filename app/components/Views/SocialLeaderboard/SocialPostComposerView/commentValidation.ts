export const COMPOSER_COMMENT_MAX_LENGTH = 250;

/**
 * Scheme links, www links, and bare domains. A Klipy GIF URL is appended
 * after this check, so it is not part of the caption the composer judges.
 */
const URL_PATTERN =
  /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z]{2,})+\b/i;

export const commentContainsUrl = (text: string): boolean =>
  URL_PATTERN.test(text);

/** Caption the composer will submit: non-empty, at most 250 characters, no links. */
export const isComposerCommentValid = (text: string): boolean => {
  const trimmed = text.trim();
  if (trimmed.length === 0 || text.length > COMPOSER_COMMENT_MAX_LENGTH) {
    return false;
  }
  return !commentContainsUrl(text);
};
