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
  // Ref: https://stackoverflow.com/questions/69297024/why-is-string-replaceall-not-a-function-on-android-react-native
  return str.split('\u202E').join('\\u202E');
};
