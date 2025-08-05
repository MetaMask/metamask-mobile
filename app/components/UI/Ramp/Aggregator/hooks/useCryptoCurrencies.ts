import { useEffect, useMemo } from 'react';
import { useRampSDK } from '../sdk';
import useSDKMethod from './useSDKMethod';
import { NATIVE_ADDRESS } from '../../../../../constants/on-ramp';
import { parseCAIP19AssetId } from '../types';

export default function useCryptoCurrencies() {
  const {
    selectedRegion,
    selectedFiatCurrencyId,
    selectedAsset,
    setSelectedAsset,
    selectedChainId,
    isBuy,
    intent,
    setIntent,
  } = useRampSDK();

  // Extract chainId from intent's assetId if present
  const intentChainId = useMemo(() => {
    if (intent?.assetId) {
      const parsed = parseCAIP19AssetId(intent.assetId);
      if (parsed) {
        if (parsed.namespace === 'eip155') {
          // For EVM networks, use just the chainId number
          return parsed.chainId;
        }
        // For non-EVM networks, use the full CAIP format
        return `${parsed.namespace}:${parsed.chainId}`;
      }
      return null;
    }
    return null;
  }, [intent?.assetId]);

  // Use intent chainId if available, otherwise fall back to selectedChainId
  const effectiveChainId = intentChainId || selectedChainId;

  // Set the chainId in the intent if we extracted it from assetId
  useEffect(() => {
    if (intentChainId && intent?.assetId && !intent.chainId) {
      setIntent((prevIntent) => ({
        ...prevIntent,
        chainId: intentChainId,
      }));
    }
  }, [intentChainId, intent?.assetId, intent?.chainId, setIntent]);

  const [
    {
      data: sdkCryptoCurrencies,
      error: errorCryptoCurrencies,
      isFetching: isFetchingCryptoCurrencies,
    },
    queryGetCryptoCurrencies,
  ] = useSDKMethod(
    isBuy ? 'getCryptoCurrencies' : 'getSellCryptoCurrencies',
    selectedRegion?.id,
    [], // paymentMethodIds is passed as a wildcard to fetch all cryptocurrencies
    selectedFiatCurrencyId,
  );

  const cryptoCurrencies = useMemo(() => {
    if (
      !isFetchingCryptoCurrencies &&
      !errorCryptoCurrencies &&
      sdkCryptoCurrencies
    ) {
      const filteredTokens = sdkCryptoCurrencies.filter(
        (token) => token.network?.chainId === effectiveChainId,
      );

      return filteredTokens;
    }
    return null;
  }, [
    errorCryptoCurrencies,
    isFetchingCryptoCurrencies,
    sdkCryptoCurrencies,
    effectiveChainId,
  ]);

  /**
   * Select the native crypto currency of first of the list
   * if current selection is not available.
   * This is using the already filtered list of tokens.
   */
  useEffect(() => {
    if (cryptoCurrencies) {
      // Handle assetId from intent first
      if (intent?.assetId) {
        const intentAsset = cryptoCurrencies.find(
          (token) => token.assetId === intent.assetId,
        );
        if (intentAsset) {
          setSelectedAsset(intentAsset);
          setIntent((prevIntent) => ({ ...prevIntent, assetId: undefined }));
          return;
        }

        // Handle slip44 asset references for native tokens
        if (intent.assetId.includes('slip44:')) {
          const nativeToken = cryptoCurrencies.find(
            (token) => token.address === NATIVE_ADDRESS,
          );
          if (nativeToken) {
            setSelectedAsset(nativeToken);
            setIntent((prevIntent) => ({ ...prevIntent, assetId: undefined }));
            return;
          }
        }
      }

      // Handle address from intent (legacy support)
      if (intent?.address) {
        const intentAsset = cryptoCurrencies.find(
          (token) =>
            token.address.toLowerCase() === intent.address?.toLowerCase(),
        );
        if (intentAsset) {
          setSelectedAsset(intentAsset);
          setIntent((prevIntent) => ({ ...prevIntent, address: undefined }));
          return;
        }
      }

      // Handle chainId-only intent (select native token) - only if no specific token was requested
      if (intent?.chainId && !intent?.assetId && !intent?.address) {
        const nativeAsset = cryptoCurrencies.find(
          (token) => token.address === NATIVE_ADDRESS,
        );
        if (nativeAsset) {
          setSelectedAsset(nativeAsset);
          setIntent((prevIntent) => ({ ...prevIntent, chainId: undefined }));
          return;
        }
      }

      if (
        !selectedAsset ||
        `${selectedAsset.network?.chainId}` !== effectiveChainId ||
        !cryptoCurrencies.find(
          (token) => token.address === selectedAsset.address,
        )
      ) {
        const nativeAsset = cryptoCurrencies.find(
          (a) => a.address === NATIVE_ADDRESS,
        );
        setSelectedAsset(nativeAsset || cryptoCurrencies?.[0]);
      }
    }
  }, [
    cryptoCurrencies,
    intent?.assetId,
    intent?.address,
    intent?.chainId,
    selectedAsset,
    effectiveChainId,
    setSelectedAsset,
    setIntent,
  ]);

  return {
    cryptoCurrencies,
    errorCryptoCurrencies,
    isFetchingCryptoCurrencies,
    queryGetCryptoCurrencies,
  };
}
