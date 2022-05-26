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
