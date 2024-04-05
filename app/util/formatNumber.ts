import BigNumber from 'bignumber.js';

const formatNumber = (value: number | string) =>
  new BigNumber(value).toFormat();

export default formatNumber;
