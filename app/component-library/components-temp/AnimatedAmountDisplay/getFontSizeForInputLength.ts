/**
 * Returns the display font size used for amount inputs as their content grows.
 * The scale keeps long values within the available input width.
 */
export const getFontSizeForInputLength = (contentLength: number): number => {
  if (contentLength <= 10) return 60;

  if (contentLength <= 18) {
    return Math.round(60 - (contentLength - 10) * 3.5);
  }

  return Math.max(12, Math.round(32 - (contentLength - 18) * (20 / 14)));
};
