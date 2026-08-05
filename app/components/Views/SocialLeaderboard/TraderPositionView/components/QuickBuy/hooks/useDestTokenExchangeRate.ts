import { isNativeAddress, isNonEvmChainId } from '@metamask/bridge-controller';
import type { Hex } from '@metamask/utils';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../../../../../reducers';
import { selectCurrencyRates } from '../../../../../../../selectors/currencyRateController';
import { selectMultichainAssetsRates } from '../../../../../../../selectors/multichain/multichain';
import { selectTokenMarketData } from '../../../../../../../selectors/tokenRatesController';
import { safeToChecksumAddress } from '../../../../../../../util/address';
import { calcTokenFiatRate } from '../../../../../../UI/Bridge/utils/exchange-rates';
import type { BridgeToken } from '../../../../../../UI/Bridge/types';

/**
 * Resolves a *display-only* user-currency-per-token exchange rate for a token,
 * independent of whether the user holds a balance of it.
 *
 * This is the same canonical `calcTokenFiatRate` calculation that
 * `usePositionTokenBalance` runs internally — but without the balance gate, so
 * the pre-quote rate pill can render for a token the user is buying for the
 * first time (and therefore holds no balance of). Returns `undefined` when no
 * price can be resolved or the token is missing.
 *
 * The returned rate is for display only. It must never be merged into the `BridgeToken`
 * reference passed to quote fetching / redux. Doing so would churn quote requests
 * on every market-data tick (see `destTokenForRate` in `useQuickBuyController`).
 */
export const useDestTokenExchangeRate = (
  token: BridgeToken | undefined,
): number | undefined => {
  const tokenMarketData = useSelector(selectTokenMarketData);
  const currencyRates = useSelector(selectCurrencyRates);
  const multichainRates = useSelector(selectMultichainAssetsRates);
  const networkConfigurations = useSelector(
    (state: RootState) =>
      state.engine.backgroundState.NetworkController
        .networkConfigurationsByChainId,
  );

  return useMemo(() => {
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
};
