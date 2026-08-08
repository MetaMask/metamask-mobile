import { isNativeAddress, isNonEvmChainId } from '@metamask/bridge-controller';
import type { Hex } from '@metamask/utils';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../../../../../reducers';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../../../../selectors/currencyRateController';
import { selectMultichainAssetsRates } from '../../../../../../../selectors/multichain/multichain';
import { selectTokenMarketData } from '../../../../../../../selectors/tokenRatesController';
import { safeToChecksumAddress } from '../../../../../../../util/address';
import {
  calcTokenFiatRate,
  getTokenExchangeRate,
} from '../../../../../../UI/Bridge/utils/exchange-rates';
import type { BridgeToken } from '../../../../../../UI/Bridge/types';

/**
 * Resolves a *display-only* user-currency-per-token exchange rate for a token,
 * independent of whether the user holds a balance of it.
 *
 * This is the same canonical `calcTokenFiatRate` calculation that
 * `usePositionTokenBalance` runs internally — but without the balance gate, so
 * the pre-quote rate pill can render for a token the user is buying for the
 * first time (and therefore holds no balance of). When no cached rate exists at
 * all — `TokenRatesController` only tracks tokens the user holds — the price is
 * fetched once from the price API, mirroring what Bridge's `TokenInputArea`
 * does via `useBridgeExchangeRates`. Returns `undefined` when no price can be
 * resolved or the token is missing.
 *
 * The returned rate is for display only. It must never be merged into the `BridgeToken`
 * reference passed to quote fetching / redux. Doing so would churn quote requests
 * on every market-data tick (see `pricedDestToken` in `useQuickBuyController`).
 */
export const useDestTokenExchangeRate = (
  token: BridgeToken | undefined,
): number | undefined => {
  const tokenMarketData = useSelector(selectTokenMarketData);
  const currencyRates = useSelector(selectCurrencyRates);
  const multichainRates = useSelector(selectMultichainAssetsRates);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const networkConfigurations = useSelector(
    (state: RootState) =>
      state.engine.backgroundState.NetworkController
        .networkConfigurationsByChainId,
  );

  const cachedRate = useMemo(() => {
    if (!token) return undefined;

    // `calcTokenFiatRate` looks up EVM `tokenMarketData` by the checksummed
    // `token.address`, mirroring `usePositionTokenBalance`. Native and non-EVM
    // addresses are passed through unchanged (non-EVM is keyed by CAIP-19).
    const pricedToken =
      isNonEvmChainId(token.chainId) || isNativeAddress(token.address)
        ? token
        : {
            ...token,
            address: safeToChecksumAddress(token.address) ?? token.address,
          };

    const rate = calcTokenFiatRate({
      token: pricedToken,
      evmMultiChainMarketData: tokenMarketData,
      networkConfigurationsByChainId: (networkConfigurations ?? {}) as Record<
        Hex,
        { nativeCurrency: string }
      >,
      evmMultiChainCurrencyRates: currencyRates,
      nonEvmMultichainAssetRates: multichainRates as Parameters<
        typeof calcTokenFiatRate
      >[0]['nonEvmMultichainAssetRates'],
    });

    return rate !== undefined && rate > 0 ? rate : undefined;
  }, [
    token,
    tokenMarketData,
    currencyRates,
    multichainRates,
    networkConfigurations,
  ]);

  const [fetchedRate, setFetchedRate] = useState<number | undefined>(undefined);
  // Identity of the token the fetched rate belongs to, so a stale response for
  // a previously selected token is never displayed against the current one.
  const fetchedForRef = useRef<string | undefined>(undefined);
  const fetchKey =
    token && !cachedRate
      ? `${token.chainId}:${token.address}:${currentCurrency}`
      : undefined;

  useEffect(() => {
    if (!fetchKey || !token) return;
    if (fetchedForRef.current === fetchKey) return;

    let isStale = false;
    fetchedForRef.current = fetchKey;
    setFetchedRate(undefined);

    getTokenExchangeRate({
      chainId: token.chainId,
      tokenAddress: token.address,
      currency: currentCurrency,
    })
      .then((rate) => {
        if (isStale) return;
        setFetchedRate(typeof rate === 'number' && rate > 0 ? rate : undefined);
      })
      .catch(() => undefined);

    return () => {
      isStale = true;
    };
    // `fetchKey` fully encodes the token identity and currency this fetch is for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchKey]);

  return cachedRate ?? (fetchKey ? fetchedRate : undefined);
};
