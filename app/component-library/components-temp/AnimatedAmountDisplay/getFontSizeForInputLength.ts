/**
 * Returns the display font size used for amount inputs as their content grows.
 * The scale keeps long values within the available input width.
 */
export const getFontSizeForInputLength = (contentLength: number): number => {
  if (contentLength <= 8) return 88;

  if (contentLength <= 24) {
    return Math.round(88 - (contentLength - 8) * 3.5);
  }

  return Math.max(12, Math.round(32 - (contentLength - 24) * (20 / 14)));
};
