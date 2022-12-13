/**
 * Method to shuffles an array of string.
 *
 * The previous method was replaced according to the following tutorial.
 * https://javascript.info/array-methods#shuffle-an-array
 *
 * @param array - Array of string.
 * @returns Array of string.
 */
// eslint-disable-next-line import/prefer-default-export
export const shuffle = (array: string[]): string[] => {
  const shuffledArray = [...array];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    // Swap elements.
    [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
  }
  return shuffledArray;
};

/**
 * Compare two SRP arrays.
 * @param validSRP - Array of string with the correct SRP.
 * @param input - Array of string with the user's input.
 * @returns Boolean indicating with the input matches the valid SRP.
 */
export const compareSRPs = (validSRP: string[], input: string[]): boolean =>
  validSRP.join('') === input.join('');
