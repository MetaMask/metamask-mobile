import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { CURRENCY_SYMBOL_BY_CHAIN_ID } from '../../../constants/network';
import { selectUseSafeChainsListValidation } from '../../../selectors/preferencesController';
import { selectEvmNetworkConfigurationsByChainId } from '../../../selectors/networkController';
import { useSafeChains, type SafeChain } from '../useSafeChains';
import { isNonEvmChainId } from '../../../core/Multichain/utils';
import type { Hex } from '@metamask/utils';

// Helpers below are extracted because React Compiler (BuildHIR) cannot lower value blocks (||, ?., ??, ternary) written inside a try/catch.
const isNonEvmOrUnconfiguredChain = (
  chainId: string,
  evmNetworkConfigurationsByChainId: ReturnType<
    typeof selectEvmNetworkConfigurationsByChainId
  >,
) =>
  isNonEvmChainId(chainId) ||
  evmNetworkConfigurationsByChainId?.[chainId as Hex] === undefined;

const symbolsMatch = (
  symbol: string | null | undefined,
  ticker: string | undefined,
) => symbol?.toLowerCase() === ticker?.toLowerCase();

const isSafeChainsListEmpty = (
  safeChainsList: SafeChain[] | undefined,
): safeChainsList is undefined | [] =>
  !safeChainsList || safeChainsList.length === 0;

const getSafeChainSymbol = (safeChainsList: SafeChain[], networkId: string) =>
  safeChainsList.find((network) => network.chainId === parseInt(networkId))
    ?.nativeCurrency?.symbol ?? null;

/**
 * Hook that check if the used symbol match with the original symbol of given network
 * @returns Boolean indicating if the native symbol is correct
 */

function useIsOriginalNativeTokenSymbol(
  chainId: string,
  ticker: string | undefined,
  type: string,
): boolean | null {
  const { safeChains: safeChainsList, error: safeChainsError } =
    useSafeChains();
  const [isOriginalNativeSymbol, setIsOriginalNativeSymbol] = useState<
    boolean | null
  >(null);

  const useSafeChainsListValidation = useSelector(
    selectUseSafeChainsListValidation,
  );
  const evmNetworkConfigurationsByChainId = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );

  useEffect(() => {
    async function getNativeTokenSymbol(networkId: string) {
      try {
        // Non-EVM or not in networkConfigurationsByChainId: treat as original (no scam warning)
        if (
          isNonEvmOrUnconfiguredChain(
            chainId,
            evmNetworkConfigurationsByChainId,
          )
        ) {
          setIsOriginalNativeSymbol(true);
          return;
        }

        // Skip if the network doesn't have symbol
        if (!ticker) {
          setIsOriginalNativeSymbol(true);
          return;
        }

        // Skip network safety checks and warning tooltip if privacy toggle is off.
        if (!useSafeChainsListValidation) {
          setIsOriginalNativeSymbol(true);
          return;
        }

        // check first on the CURRENCY_SYMBOL_BY_CHAIN_ID
        const mappedCurrencySymbol = CURRENCY_SYMBOL_BY_CHAIN_ID[networkId];

        if (mappedCurrencySymbol) {
          setIsOriginalNativeSymbol(symbolsMatch(mappedCurrencySymbol, ticker));
          return;
        }

        // If chains API failed, can't verify - assume unsafe
        if (safeChainsError) {
          setIsOriginalNativeSymbol(false);
          return;
        }

        // Wait for safeChainsList to load before checking
        // Keep state as null (loading) to avoid false warnings
        if (isSafeChainsListEmpty(safeChainsList)) {
          return;
        }

        // check safety network using a third part
        const symbol = getSafeChainSymbol(safeChainsList, networkId);
        setIsOriginalNativeSymbol(symbolsMatch(symbol, ticker));
        return;
      } catch (err) {
        setIsOriginalNativeSymbol(false);
      }
    }
    getNativeTokenSymbol(chainId);
  }, [
    chainId,
    ticker,
    type,
    useSafeChainsListValidation,
    safeChainsList,
    safeChainsError,
    evmNetworkConfigurationsByChainId,
  ]);

  return isOriginalNativeSymbol;
}

export default useIsOriginalNativeTokenSymbol;
