/**
 * Takes a string as input and transforms it into a capitalized string
 *
 * @param inputString string to be transformed
 * @returns capitalized
 */
// eslint-disable-next-line import/prefer-default-export
export const getCapitalizedString = (inputString: string) => {
  const lowCaseString = inputString.toLowerCase();
  const upperCaseFirstLetter = lowCaseString.charAt(0).toUpperCase();

  return `${upperCaseFirstLetter}${lowCaseString.slice(1)}`;
};
