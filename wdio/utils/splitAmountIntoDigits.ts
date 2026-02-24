export const splitAmountIntoDigits = (amount: number | string): (number | string)[] =>
  amount
    .toString()
    .split('')
    .map((char: string): number | string =>
      /\d/.test(char) ? parseInt(char, 10) : char,
    );