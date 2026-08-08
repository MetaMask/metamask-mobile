import { toDecimalString } from './number/bigint';

const formattedDeeplinkParsedValue = (value: string) =>
  BigInt(toDecimalString(value)).toString();

export default formattedDeeplinkParsedValue;
