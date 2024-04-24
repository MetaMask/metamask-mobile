// This regex matches a string that is a number with an optional decimal part.
const regex = /^(\d*)(\.\d+)?$/;

function parseAmount(amount: string, decimalPlaces = 0) {
  try {
    //If the amount is not a string that matches the regex, return undefined
    const match = amount.match(regex);
    if (!match) {
      return;
    }

    // Capture groups: 1 is the integer part, 2 is the decimal part
    const integer = match[1] || '0';
    const decimal = match[2] || '';

    // We need to remove leading zeros from the integer part, if there
    // was only 0s, we need to keep one 0
    const trimmedInteger = integer.replace(/^0+/, '') || '0';

    // We need to remove trailing zeros from the decimal part
    let trimmedDecimal = decimal.replace(/0+$/, '');

    // If the decimal part is longer than 1, it starts with a period
    if (trimmedDecimal.length > 1) {
      // We need to keep the period and the first decimalPlaces characters
      trimmedDecimal = `.${trimmedDecimal.slice(1, decimalPlaces + 1)}`;
      // We need to remove trailing zeros from the decimal part
      trimmedDecimal = trimmedDecimal.replace(/0+$/, '');
    }

    // If the trimmedDecimal has only one character and it is a period, we need to remove it
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
