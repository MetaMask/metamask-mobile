import { hexToDecimal } from '../../../../util/conversions';
import { BigNumber } from 'bignumber.js';

// Helper function to convert hex balance to decimal token amount
export function convertHexBalanceToDecimal(
  hexBalance: string,
  decimals: number,
): string {
  if (!hexBalance || hexBalance === '0x0' || hexBalance === '0') {
    return '0';
  }

  // Convert hex to decimal using hexToDecimal
  const decimalValue = hexToDecimal(hexBalance);

  // Convert to BigNumber and divide by 10^decimals
  const balanceBN = new BigNumber(decimalValue);
  const divisor = new BigNumber(10).pow(decimals);
  const tokenAmount = balanceBN.div(divisor);

  return tokenAmount.toString();
}
