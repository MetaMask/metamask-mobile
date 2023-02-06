/**
 * The method escape RTL character in string
 *
 * @param {string} str
 * @returns {(string|*)} escaped string or original param value
 */
export const sanitizeString = (str: any): string => {
  if (!str) {
    return str;
  }
  const regex = /\u202E/giu;
  return str.replaceAll(regex, '\\u202E');
};
