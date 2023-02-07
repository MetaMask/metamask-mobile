import { isString } from '../lodash';

/**
 * The method escape RTL character in string
 *
 * @param {any} str
 * @returns {(string|*)} escaped string or original param value
 */
export default (str: any): any => {
  if (!str) {
    return str;
  }
  if (!isString(str)) {
    return str;
  }
  const regex = /\u202E/giu;
  return str.replaceAll(regex, '\\u202E');
};
