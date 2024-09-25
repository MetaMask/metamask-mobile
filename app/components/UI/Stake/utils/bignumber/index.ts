import BigNumber from 'bignumber.js';

export enum BigNumberUtilsReturnFormat {
  NUMBER = 'NUMBER',
  BN = 'BN',
  STRING = 'STRING',
}

export type BigNumberUtilsReturnType = BigNumber | number | string;

export const bnZero = new BigNumber(0);
export const bnOne = new BigNumber(1);
export const bnTen = new BigNumber(10);

export const getPowerOfTen = (pow: number): BigNumber => bnTen.pow(pow);

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
