import { useMemo } from 'react';
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

export const formatAmount = (effectiveGasFee: string, decimals: number) => {
  // Truncate to token.decimals to avoid parseUnits overflow
  const decimalIndex = effectiveGasFee.indexOf('.');
  return decimalIndex === -1
    ? effectiveGasFee
    : effectiveGasFee.slice(0, decimalIndex + 1 + decimals);
};

export const parseAmount = (effectiveGasFee: string, decimals: number) => {
  const formattedFee = formatAmount(effectiveGasFee, decimals);
  return parseUnits(formattedFee, decimals);
};

const useIsInsufficientBalance = ({
  amount,
  token,
  latestAtomicBalance,
}: UseIsInsufficientBalanceParams): boolean => {
  const quotes = useSelector(selectBridgeQuotes);
  const minSolBalance = useSelector(selectMinSolBalance);

  // Extract only the required data from quote to prevent
  // uneccessary rerenders that can use infinite loops.
  const bestQuote = quotes?.recommendedQuote;
  const gasIncluded = bestQuote?.quote?.gasIncluded;
  const gasIncluded7702 = bestQuote?.quote?.gasIncluded7702;
  const gasSponsored = bestQuote?.quote?.gasSponsored;
  const gasAmount = bestQuote?.gasFee?.effective?.amount;

  return useMemo(() => {
    const isValidAmount =
      amount !== undefined && amount !== '.' && token?.decimals;

    // If we don't have valid inputs yet, return false (no error)
    if (!isValidAmount || !token) {
      return false;
    }

    // If we don't have balance data yet (e.g., during token switching),
    // return true to prevent invalid swaps until balance is loaded
    if (!latestAtomicBalance) {
      return true;
    }

    // Normalize amount to token decimals and handle excess decimals
    let inputAmount: BigNumber;
    try {
      const normalizedAmount = normalizeAmount(amount, token.decimals);
      inputAmount = parseAmount(normalizedAmount, token.decimals);
    } catch {
      // If we can't parse the amount, treat it as invalid (insufficient balance)
      return true;
    }

    const isNativeToken = token.chainId && isNativeAddress(token.address);
    const isSOL = isNativeToken && isSolanaChainId(token.chainId);
    const isGasless = gasIncluded7702 || gasIncluded;

    // Calculate gas fees if needed for native token source
    // For ERC-20 tokens (USDC, DAI, etc.), gas is checked separately in useHasSufficientGas
    // For native tokens (ETH, MATIC, etc.), gas comes from the SAME balance we're spending,
    // so we need to ensure: balance >= sourceAmount + gasAmount
    // NOTE: If gas is sponsored/included, we skip adding gas to the calculation but still check token balance
    let atomicGasFee = BigNumber.from(0);
    if (isNativeToken && !isGasless && !gasSponsored) {
      const effectiveGasFee = isNumberValue(gasAmount)
        ? // we guard against null and undefined values of gasAmount when checked isNumberValue
          new BigNumberJS(gasAmount as string | number).toFixed()
        : null;

      if (effectiveGasFee) {
        atomicGasFee = parseAmount(effectiveGasFee, token.decimals);
      }
    }

    let isInsufficientBalance = false;

    if (isSOL) {
      // SOL: check if balance - inputAmount >= minSolBalance (rent exemption)
      const minSolBalanceLamports = parseUnits(minSolBalance, token.decimals);
      const remainingBalance = latestAtomicBalance.sub(inputAmount);
      isInsufficientBalance =
        isInsufficientBalance || remainingBalance.lt(minSolBalanceLamports);
    } else if (
      isNativeToken &&
      !isGasless &&
      !gasSponsored &&
      atomicGasFee.gt(0)
    ) {
      // Native tokens (ETH, MATIC, etc.): check balance >= sourceAmount + gasAmount
      // Example: User has 1 ETH, wants to send 1 ETH, needs 0.01 ETH gas = insufficient
      const totalRequired = inputAmount.add(atomicGasFee);
      isInsufficientBalance =
        isInsufficientBalance || totalRequired.gt(latestAtomicBalance);
    } else {
      // All other cases: ERC-20 tokens, gasless transactions, or gas-sponsored transactions
      // Check balance >= sourceAmount only (gas is either not needed or checked separately)
      // Example: User has 100 USDC, wants to send 50 USDC = sufficient
      // Example: User has 0.0004 BTC, wants to send 0.0114 BTC (gasless) = insufficient
      isInsufficientBalance =
        isInsufficientBalance || inputAmount.gt(latestAtomicBalance);
    }

    return Boolean(isInsufficientBalance);
  }, [
    amount,
    token,
    latestAtomicBalance,
    gasIncluded,
    gasIncluded7702,
    gasSponsored,
    gasAmount,
    minSolBalance,
  ]);
};

export default useIsInsufficientBalance;
