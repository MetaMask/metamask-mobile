import BigNumber from 'bignumber.js';
import { BigNumber as BN } from 'ethers';

export enum BigNumberUtilsReturnFormat {
  NUMBER = 'NUMBER',
  // eslint-disable-next-line @typescript-eslint/no-shadow
  BN = 'BN',
  STRING = 'STRING',
}

export type BigNumberUtilsReturnType = BigNumber | number | string;

const formatHelper = (
  val: BigNumber,
  returnFormat: BigNumberUtilsReturnFormat,
): BigNumberUtilsReturnType => {
  switch (returnFormat) {
    case BigNumberUtilsReturnFormat.NUMBER:
      return val.toNumber();
    case BigNumberUtilsReturnFormat.STRING:
      return val.toString();
    case BigNumberUtilsReturnFormat.BN:
    default:
      return val;
  }
};

export const bnZero = new BigNumber(0);
export const bnOne = new BigNumber(1);
export const bnTen = new BigNumber(10);

export const getPowerOfTen = (pow: number): BigNumber => bnTen.pow(pow);

export const getPowerOfTenFormatted = (
  pow: number,
  returnFormat: BigNumberUtilsReturnFormat = BigNumberUtilsReturnFormat.BN,
): BigNumberUtilsReturnType => formatHelper(getPowerOfTen(pow), returnFormat);

export const getValueAsBn = (value: BigNumber | string | number): BigNumber =>
  typeof value === 'string' || typeof value === 'number'
    ? new BigNumber(value)
    : value;

export const multiplyValueByPowerOfTen = (
  value: BigNumber | string | number,
  pow: number,
): BigNumber => {
  const valueAsBn = getValueAsBn(value);
  const power = getPowerOfTen(pow);

  let override;
  // 0 * Number.POSITIVE_INFINITY is NaN, but this is a weird outcome so let's say it equals 0
  if (valueAsBn.eq(0) && power.eq(Number.POSITIVE_INFINITY)) override = bnZero;
  if (valueAsBn.eq(Number.POSITIVE_INFINITY) && power.eq(0)) override = bnZero;
  if (valueAsBn.eq(Number.NEGATIVE_INFINITY) && power.eq(0)) override = bnZero;

  const calculated = override || valueAsBn.multipliedBy(power);
  return calculated;
};

export const multiplyValueByPowerOfTenFormatted = (
  value: BigNumber | string | number,
  pow: number,
  returnFormat: BigNumberUtilsReturnFormat = BigNumberUtilsReturnFormat.BN,
): BigNumberUtilsReturnType =>
  formatHelper(multiplyValueByPowerOfTen(value, pow), returnFormat);

export const getBigNumberFromBN = (value: BN): BigNumber =>
  new BigNumber(value.toString());

/**
 * Converts a number-like into an ethers BigNumber.
 *
 * @param num Number-like to convert into a BigNumber.
 * @returns Number-like as a BigNumber.
 */
const getBigNumber = (num: BigNumberUtilsReturnType): BN => BN.from(num);

/**
 * Converts a number-like into a number.
 *
 * @param num Number-like to convert into a number.
 * @returns Number-like as a number.
 */
export const getNumber = (num: BigNumberUtilsReturnType): number =>
  getBigNumber(num).toNumber();
