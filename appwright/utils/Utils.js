export const splitAmountIntoDigits = (amount) =>
  // Convert to string and split into array of digits
  amount
    .toString()
    .split('')
    .map((char) =>
      // Return only numeric digits, filter out decimal points, commas, etc.
      /\d/.test(char) ? parseInt(char, 10) : char,
    );
