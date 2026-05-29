/**
 * Converts a numeric string that may be in scientific notation (e.g. "1e+21")
 * to a plain decimal string, without going through a JS Number (which would
 * lose precision for values beyond 2^53).
 *
 * Only positive integer exponents are handled — these are the only form
 * eth-url-parser produces for uint256/value fields.
 */
const formattedDeeplinkParsedValue = (value: string) => {
  if (!/e/i.test(value)) return value;

  const [mantissa, rawExp] = value.toLowerCase().split('e');
  const exponent = parseInt(rawExp, 10);

  if (isNaN(exponent) || exponent < 0) return value;

  const [intPart, decPart = ''] = mantissa.split('.');
  // Combine digits and shift decimal point right by `exponent` places.
  const digits = intPart + decPart;
  const totalShift = intPart.length + exponent;

  return digits.padEnd(totalShift, '0').slice(0, totalShift);
};

export default formattedDeeplinkParsedValue;
