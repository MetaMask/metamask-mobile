/**
 * Adds thousands separators without converting to a JavaScript number, which
 * preserves token amounts beyond Number.MAX_SAFE_INTEGER and trailing decimals
 * while the user is typing.
 */
export const formatAmountWithCommas = (value: string): string => {
  const [integerPart, ...fractionParts] = value.split('.');
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/gu, ',');

  return fractionParts.length
    ? `${formattedInteger}.${fractionParts.join('.')}`
    : formattedInteger;
};
