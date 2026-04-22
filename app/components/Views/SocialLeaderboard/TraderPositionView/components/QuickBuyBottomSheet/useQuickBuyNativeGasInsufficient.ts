import { useMemo } from 'react';
import { BigNumber } from 'ethers';
import { BigNumber as BigNumberJS } from 'bignumber.js';
import { isNativeAddress, isSolanaChainId } from '@metamask/bridge-controller';
import { parseAmount } from '../../../../../UI/Bridge/hooks/useInsufficientBalance';
import { isNumberValue } from '../../../../../../util/number';
import type { BridgeToken } from '../../../../../UI/Bridge/types';
import type { EnrichedQuickBuyQuote } from './useQuickBuyQuotes';

// Mirrors normalizeAmount from useInsufficientBalance — kept private here so
// the shared hook stays untouched. Only converts scientific notation; leaves
// plain decimal strings unchanged.
const normalizeAmount = (value: string, decimals: number): string => {
  if (!value.toLowerCase().includes('e')) return value;
  const num = Number(value);
  if (isNaN(num)) return '0';
  return num.toFixed(decimals).replace(/\.?0+$/, '');
};

interface UseQuickBuyNativeGasInsufficientParams {
  amount: string | undefined;
  token: BridgeToken | undefined;
  latestAtomicBalance: BigNumber | undefined;
  quote: EnrichedQuickBuyQuote | undefined;
}

// Gates the "balance >= inputAmount + gas" check for native EVM source tokens
// that would otherwise be covered by `useIsInsufficientBalance`. QuickBuy runs
// its own fetchQuotes flow and never populates `BridgeController.state.quotes`,
// so the Redux-reading shared hook can't see the gas amount. Here we pair
// `useIsInsufficientBalance({ ignoreGasFees: true })` with this hook — OR their
// results to get the full check without touching the shared Bridge surface.
const useQuickBuyNativeGasInsufficient = ({
  amount,
  token,
  latestAtomicBalance,
  quote,
}: UseQuickBuyNativeGasInsufficientParams): boolean =>
  useMemo(() => {
    if (
      !token ||
      !token.chainId ||
      token.decimals === undefined ||
      amount === undefined ||
      amount === '.' ||
      !latestAtomicBalance
    ) {
      return false;
    }

    const isNativeToken = isNativeAddress(token.address);
    if (!isNativeToken) return false;
    // SOL rent exemption is already covered by `useIsInsufficientBalance` even
    // with `ignoreGasFees: true`, so leave SOL to the shared hook.
    if (isSolanaChainId(token.chainId)) return false;

    const gasIncluded = quote?.quote?.gasIncluded;
    const gasIncluded7702 = quote?.quote?.gasIncluded7702;
    const gasSponsored = quote?.quote?.gasSponsored;
    if (gasIncluded || gasIncluded7702 || gasSponsored) return false;

    const gasAmount = quote?.gasFee?.effective?.amount;
    if (!isNumberValue(gasAmount)) return false;

    const effectiveGasFee = new BigNumberJS(
      gasAmount as string | number,
    ).toFixed();
    if (!effectiveGasFee) return false;

    let inputAmount: BigNumber;
    let atomicGasFee: BigNumber;
    try {
      const normalizedAmount = normalizeAmount(amount, token.decimals);
      inputAmount = parseAmount(normalizedAmount, token.decimals);
      atomicGasFee = parseAmount(effectiveGasFee, token.decimals);
    } catch {
      return false;
    }

    if (atomicGasFee.lte(0)) return false;

    return inputAmount.add(atomicGasFee).gt(latestAtomicBalance);
  }, [amount, token, latestAtomicBalance, quote]);

export default useQuickBuyNativeGasInsufficient;
