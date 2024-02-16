import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { CHAIN_ID_TO_CURRENCY_SYMBOL_MAP } from '../../../../../app/constants/network';
import { selectUseSafeChainsListValidation } from '../../../../../app/selectors/preferencesController';
import axios from 'axios';
import { toHexadecimal } from '../../../../../app/util/number';

/**
 * Hook that check if the used symbol match with the original symbol of given network
 * @returns {boolean} isOriginalNativeSymbol
 */

function useIsOriginalNativeTokenSymbol(
  chainId: string,
  ticker: string | undefined,
  type: string,
) {
  const [isOriginalNativeSymbol, setIsOriginalNativeSymbol] = useState(false);

  const useSafeChainsListValidation = useSelector(
    selectUseSafeChainsListValidation,
  );

  useEffect(() => {
    async function getNativeTokenSymbol(networkId: string) {
      try {
        if (!useSafeChainsListValidation) {
          setIsOriginalNativeSymbol(true);
          return;
        }

        const mappedCurrencySymbol =
          CHAIN_ID_TO_CURRENCY_SYMBOL_MAP[toHexadecimal(networkId)];

        if (mappedCurrencySymbol) {
          setIsOriginalNativeSymbol(mappedCurrencySymbol === ticker);
          return;
        }

        const { data: safeChainsList } = await axios.get(
          'https://chainid.network/chains.json',
        );

        const matchedChain = safeChainsList.find(
          (network: { chainId: number }) =>
            network.chainId === parseInt(networkId),
        );

        const symbol = matchedChain?.nativeCurrency?.symbol ?? null;
        setIsOriginalNativeSymbol(symbol === ticker);
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
  ]);

  return isOriginalNativeSymbol;
}

export default useIsOriginalNativeTokenSymbol;
