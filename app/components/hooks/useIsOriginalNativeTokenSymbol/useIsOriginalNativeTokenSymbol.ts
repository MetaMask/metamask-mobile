import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { CURRENCY_SYMBOL_BY_CHAIN_ID } from '../../../constants/network';
import { selectUseSafeChainsListValidation } from '../../../selectors/preferencesController';
import { useSafeChains } from '../useSafeChains';

/**
 * Hook that check if the used symbol match with the original symbol of given network
 * @returns Boolean indicating if the native symbol is correct
 */

function useIsOriginalNativeTokenSymbol(
  chainId: string,
  ticker: string | undefined,
  type: string,
): boolean | null {
  const { safeChains: safeChainsList } = useSafeChains();
  const [isOriginalNativeSymbol, setIsOriginalNativeSymbol] = useState<
    boolean | null
  >(null);

  const useSafeChainsListValidation = useSelector(
    selectUseSafeChainsListValidation,
  );

  useEffect(() => {
    async function getNativeTokenSymbol(networkId: string) {
      try {
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
          setIsOriginalNativeSymbol(
            mappedCurrencySymbol?.toLowerCase() === ticker?.toLowerCase(),
          );
          return;
        }

        // check safety network using a third part
        const matchedChain = safeChainsList?.find(
          (network) => network.chainId === parseInt(networkId),
        );

        const symbol = matchedChain?.nativeCurrency?.symbol ?? null;
        setIsOriginalNativeSymbol(
          symbol?.toLowerCase() === ticker?.toLowerCase(),
        );
        return;
      } catch (err) {
        setIsOriginalNativeSymbol(false);
      }
    }
    getNativeTokenSymbol(chainId);
  }, [
    isOriginalNativeSymbol,
    chainId,
    ticker,
    type,
    useSafeChainsListValidation,
    safeChainsList,
  ]);

  return isOriginalNativeSymbol;
}

export default useIsOriginalNativeTokenSymbol;
