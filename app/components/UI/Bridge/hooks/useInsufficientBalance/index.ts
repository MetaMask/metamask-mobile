import { useSelector } from 'react-redux';
import { selectMinSolBalance } from '../../../../../selectors/bridgeController';
import { parseUnits } from 'ethers/lib/utils';
import { BridgeToken } from '../../types';
import { isNativeAddress, isSolanaChainId } from '@metamask/bridge-controller';
import { selectBridgeQuotes } from '../../../../../core/redux/slices/bridge';
import { BigNumber } from 'ethers';

interface UseIsInsufficientBalanceParams {
  amount: string | undefined;
  token: BridgeToken | undefined;
  latestAtomicBalance: BigNumber | undefined;
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

const useIsInsufficientBalance = ({
  amount,
  token,
  latestAtomicBalance,
}: UseIsInsufficientBalanceParams): boolean => {
  const quotes = useSelector(selectBridgeQuotes);
  const minSolBalance = useSelector(selectMinSolBalance);

  const bestQuote = quotes?.recommendedQuote;
  const { gasIncluded } = bestQuote?.quote ?? {};

  const isValidAmount =
    amount !== undefined && amount !== '.' && token?.decimals;

  // Safety check for decimal places before parsing
  const hasValidDecimals =
    isValidAmount &&
    (() => {
      // Convert scientific notation to decimal string if needed
      const normalizedAmount = normalizeAmount(amount, token.decimals);
      const decimalPlaces = normalizedAmount.includes('.')
        ? normalizedAmount.split('.')[1].length
        : 0;
      return decimalPlaces <= token.decimals;
    })();

  // Only perform calculations if we have valid inputs and gas is not included
  if (
    !isValidAmount ||
    !hasValidDecimals ||
    !token ||
    !latestAtomicBalance ||
    !!gasIncluded
  ) {
    return false;
  }

  const inputAmount = parseUnits(
    normalizeAmount(amount, token.decimals),
    token.decimals,
  );
  const isSOL =
    token.chainId &&
    isSolanaChainId(token.chainId) &&
    isNativeAddress(token.address);

  let isInsufficientBalance = false;

  if (isSOL) {
    // For SOL: check if balance - inputAmount >= minSolBalance (rent exemption)
    const minSolBalanceLamports = parseUnits(minSolBalance, token.decimals);
    const remainingBalance = latestAtomicBalance.sub(inputAmount);
    isInsufficientBalance =
      isInsufficientBalance || remainingBalance.lt(minSolBalanceLamports);
  } else {
    // For non-SOL: just check if inputAmount > balance
    isInsufficientBalance =
      isInsufficientBalance || inputAmount.gt(latestAtomicBalance);
  }

  return Boolean(isInsufficientBalance);
};

export default useIsInsufficientBalance;
