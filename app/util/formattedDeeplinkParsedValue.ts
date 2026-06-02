import BigNumber from 'bignumber.js';

const formattedDeeplinkParsedValue = (value: string) =>
  new BigNumber(value).toFixed();

export default formattedDeeplinkParsedValue;
