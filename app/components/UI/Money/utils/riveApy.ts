/**
 * Smallest and largest digit counts the onboarding artboard can lay out. Its
 * APY container is authored for one, two or three digits; anything outside
 * that range has no layout to select, so the count is clamped into it.
 */
export const APY_DIGIT_MIN = 1;
export const APY_DIGIT_MAX = 3;

/**
 * Counts the digits in a formatted APY so the Rive artboard can size its APY
 * container: "4%" is one digit, "4.6%" and "14%" are two, "146%" is three.
 * The percent sign and decimal separator are not digits and do not count.
 */
export function apyDigitCount(formattedApy: string): number {
  const digits = formattedApy.replace(/\D/gu, '').length;
  return Math.min(Math.max(digits, APY_DIGIT_MIN), APY_DIGIT_MAX);
}
