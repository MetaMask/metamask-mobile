import { useSelector } from 'react-redux';
import { selectMinSolBalance } from '../../../../../selectors/bridgeController';
import { parseUnits } from 'ethers/lib/utils';
import { BridgeToken } from '../../types';
import { isNativeAddress, isSolanaChainId } from '@metamask/bridge-controller';
import { selectBridgeQuotes } from '../../../../../core/redux/slices/bridge';
import { BigNumber } from 'ethers';
import { BigNumber as BigNumberJS } from 'bignumber.js';
import { isNumberValue } from '../../../../../util/number';

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
  const { gasIncluded, gasIncluded7702, gasSponsored } = bestQuote?.quote ?? {};
  const isGasless = gasIncluded7702 || gasIncluded;

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
    !!isGasless ||
    !!gasSponsored
  ) {
    return false;
  }

  const inputAmount = parseUnits(
    normalizeAmount(amount, token.decimals),
    token.decimals,
  );

  const isNativeToken = token.chainId && isNativeAddress(token.address);
  const isSOL = isNativeToken && isSolanaChainId(token.chainId);

  // Calculate gas fees if needed for native token source
  // For ERC-20 tokens (USDC, DAI, etc.), gas is checked separately in useHasSufficientGas
  // For native tokens (ETH, MATIC, etc.), gas comes from the SAME balance we're spending,
  // so we need to ensure: balance >= sourceAmount + gasAmount
  let atomicGasFee = BigNumber.from(0);
  if (isNativeToken && !isGasless) {
    const gasAmount = bestQuote?.gasFee?.effective?.amount;
    const effectiveGasFee = isNumberValue(gasAmount)
      ? // we guard against null and undefined values of gasAmount when checked isNumberValue
        new BigNumberJS(gasAmount as string | number).toFixed()
      : null;

    if (effectiveGasFee) {
      atomicGasFee = parseUnits(effectiveGasFee, token.decimals);
    }
  }

  let isInsufficientBalance = false;

  if (isSOL) {
    // SOL: check if balance - inputAmount >= minSolBalance (rent exemption)
    const minSolBalanceLamports = parseUnits(minSolBalance, token.decimals);
    const remainingBalance = latestAtomicBalance.sub(inputAmount);
    isInsufficientBalance =
      isInsufficientBalance || remainingBalance.lt(minSolBalanceLamports);
  } else if (isNativeToken && !isGasless && atomicGasFee.gt(0)) {
    // Native tokens (ETH, MATIC, etc.): check balance >= sourceAmount + gasAmount
    // Example: User has 1 ETH, wants to send 1 ETH, needs 0.01 ETH gas = insufficient
    const totalRequired = inputAmount.add(atomicGasFee);
    isInsufficientBalance =
      isInsufficientBalance || totalRequired.gt(latestAtomicBalance);
  } else {
    // ERC-20 tokens or gasless transactions: check balance >= sourceAmount only
    // Example: User has 100 USDC, wants to send 50 USDC = sufficient
    // (Gas check happens separately in useHasSufficientGas for ERC-20 tokens)
    isInsufficientBalance =
      isInsufficientBalance || inputAmount.gt(latestAtomicBalance);
  }

  return Boolean(isInsufficientBalance);
};

export default useIsInsufficientBalance;
