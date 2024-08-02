// This regex matches a string that is a number with an optional decimal part.
const regex = /^(\d*)(\.\d+)?$/;

function trimLeadingZeros(str: string) {
  let trimmed = str;
  while (trimmed.startsWith('0')) {
    trimmed = trimmed.slice(1);
  }
  return trimmed || '0';
}

function trimTrailingZeros(str: string) {
  let trimmed = str;
  while (trimmed.endsWith('0')) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed;
}

function parseAmount(amount: string, decimalPlaces = 0) {
  try {
    //If the amount is not a string that matches the regex, return undefined
    const match = regex.exec(amount);
    if (!match) {
      return;
    }

    // Capture groups: 1 is the integer part, 2 is the decimal part
    const integer = match[1] || '0';
    const decimal = match[2] || '';

    // We need to remove leading zeros from the integer part, if there
    // was only 0s, we need to keep one 0
    const trimmedInteger = trimLeadingZeros(integer);

    // We need to remove trailing zeros from the decimal part
    let trimmedDecimal = trimTrailingZeros(decimal);

    // If the decimal part is longer than 1, it starts with a period a is followed by a non zero character
    if (trimmedDecimal.length > 1) {
      // We need to keep the period and the first decimalPlaces characters
      trimmedDecimal = `.${trimmedDecimal.slice(1, decimalPlaces + 1)}`;
      // We need to remove trailing zeros from the decimal part
      trimmedDecimal = trimTrailingZeros(trimmedDecimal);
    }

    // If the trimmedDecimal has only one character, it is a period and we need to remove it
    if (trimmedDecimal.length === 1) {
      trimmedDecimal = '';
    }

    return `${trimmedInteger}${trimmedDecimal}`;
  } catch (error) {
    console.error(error);
    return;
  }
}

export default parseAmount;
