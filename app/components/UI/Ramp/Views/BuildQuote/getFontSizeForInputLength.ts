/**
 * Matches Predict amount display scaling — see PredictAmountDisplay.tsx
 * (getFontSizeForInputLength + lineHeight = fontSize + 10).
 */
export function getFontSizeForInputLength(contentLength: number): number {
  if (contentLength <= 8) {
    return 60;
  }
  if (contentLength <= 10) {
    return 48;
  }
  if (contentLength <= 12) {
    return 32;
  }
  if (contentLength <= 14) {
    return 24;
  }
  if (contentLength <= 18) {
    return 18;
  }
  return 12;
}
