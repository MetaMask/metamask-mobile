/**
 * Converts a numeric string that may be in scientific notation (e.g. "1e+21")
 * to a plain decimal string suitable for BigInt parsing, without going through
 * a JS float (which loses precision beyond 2^53).
 */
const toDecimalString = (value: string): string => {
  if (!/e/i.test(value)) return value;

  const [mantissa, rawExp] = value.toLowerCase().split('e');
  const exponent = parseInt(rawExp, 10);

  if (isNaN(exponent) || exponent < 0) return value;

  const [intPart, decPart = ''] = mantissa.split('.');
  const digits = intPart + decPart;
  const totalShift = intPart.length + exponent;

  return digits.padEnd(totalShift, '0').slice(0, totalShift);
};

const formattedDeeplinkParsedValue = (value: string) =>
  BigInt(toDecimalString(value)).toString();

export default formattedDeeplinkParsedValue;
