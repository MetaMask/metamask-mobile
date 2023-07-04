/**
 * Function that checks if value is zero
 *
 * @param value number | any
 * @returns
 */
export const isZero = (value: number | any): boolean => {
  if (value?.toString && value?.toString?.() === '0') {
    return true;
  }
  return false;
};

/**
 * Function that checks if value is less than or equal to other
 *
 * @param value number
 * @param other number
 * @returns
 */
export const lte = (value: number, other: number): boolean =>
  Number(value) <= Number(other);

/**
 * Function that checks if value is greater than or equal to other
 *
 * @param value number
 * @param other number
 * @returns
 */
export const gte = (value: number, other: number): boolean =>
  Number(value) >= Number(other);

/**
 * Function that checks if value is less than other
 *
 * @param value number
 * @param other number
 * @returns
 */
export const lt = (value: number, other: number): boolean =>
  Number(value) < Number(other);

/**
 * Function that checks if value is greater than other
 *
 * @param value number
 * @param other number
 * @returns
 */
export const gt = (value: number, other: number): boolean =>
  Number(value) > Number(other);

/**
 * Gets the `toStringTag` of `value`.
 *
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */
function getTag(value: any): string {
  const objToString = Object.prototype.toString;
  if (value === null) {
    return value === undefined ? '[object Undefined]' : '[object Null]';
  }
  return objToString.call(value);
}

/**
 * Checks if `value` is classified as a `String` primitive or object.
 *
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a string, else `false`.
 */
export function isString(value: any): boolean {
  const type = typeof value;
  return (
    type === 'string' ||
    (type === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      getTag(value) === '[object String]')
  );
}
