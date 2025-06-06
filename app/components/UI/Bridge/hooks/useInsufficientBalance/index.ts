import { useSelector } from 'react-redux';
import { selectBridgeControllerState } from '../../../../../selectors/bridgeController';
import { useLatestBalance } from '../useLatestBalance';
import { BigNumber } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { BridgeToken } from '../../types';

interface UseIsInsufficientBalanceParams {
  amount: string | undefined;
  token: BridgeToken | undefined;
}

const normalizeAmount = (value: string, decimals: number): string => {
  // Check if the value is in scientific notation
  if (value.toLowerCase().includes('e')) {
    // Convert to decimal notation using the token's decimal precision
    const num = Number(value);
    // Return '0' for invalid numbers
    if (isNaN(num)) {
      return '0';
    }
    // Remove trailing zeroes after converting from scientific notation
    return num.toFixed(decimals).replace(/\.?0+$/, '');
  }
  return value;
};

const useIsInsufficientBalance = ({ amount, token }: UseIsInsufficientBalanceParams): boolean => {
  const { quoteRequest } = useSelector(selectBridgeControllerState);
  const latestBalance = useLatestBalance({
    address: token?.address,
    decimals: token?.decimals,
    chainId: token?.chainId,
    balance: token?.balance,
  });

  const isValidAmount =
    amount !== undefined && amount !== '.' && token?.decimals;

  // Safety check for decimal places before parsing
  const hasValidDecimals = isValidAmount && (() => {
    // Convert scientific notation to decimal string if needed
    const normalizedAmount = normalizeAmount(amount, token.decimals);
    const decimalPlaces = normalizedAmount.includes('.') ? normalizedAmount.split('.')[1].length : 0;
    return decimalPlaces <= token.decimals;
  })();

  // quoteRequest.insufficientBal is undefined for Solana quotes, so we need to manually check if the source amount is greater than the balance
  const isInsufficientBalance = quoteRequest?.insufficientBal ||
    (isValidAmount &&
      hasValidDecimals &&
      parseUnits(normalizeAmount(amount, token.decimals), token.decimals).gt(
        latestBalance?.atomicBalance ?? BigNumber.from(0),
      ));

  return Boolean(isInsufficientBalance);
};

export default useIsInsufficientBalance;
