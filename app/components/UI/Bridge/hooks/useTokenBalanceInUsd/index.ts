import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  formatChainIdToCaip,
  formatChainIdToHex,
  isNonEvmChainId,
} from '@metamask/bridge-controller';
import type { BridgeToken } from '../../types';
import { CaipAssetType, Hex, isCaipChainId } from '@metamask/utils';
import { RootState } from '../../../../../reducers';
import { selectCurrencyRates } from '../../../../../selectors/currencyRateController';
import { selectSingleTokenPriceMarketData } from '../../../../../selectors/tokenRatesController';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import {
  selectMultichainAssetsRates,
  selectMultichainBalances,
} from '../../../../../selectors/multichain';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import { selectSingleTokenBalance } from '../../../../../selectors/tokenBalancesController';
import { toChecksumAddress } from '../../../../../util/address';
import { fromTokenMinimalUnitString } from '../../../../../util/number';
import {
  calcTokenFiatValue,
  calcUsdAmountFromFiat,
} from '../../utils/exchange-rates';

/**
 * Resolves the given token's balance and converts it to a USD amount.
 * Handles both EVM (TokenBalancesController) and non-EVM (MultichainBalancesController) tokens.
 */
export const useTokenBalanceInUsd = (
  token?: BridgeToken,
): number | undefined => {
  const evmMultiChainCurrencyRates = useSelector(selectCurrencyRates);
  const networkConfigurationsByChainId = useSelector(
    selectNetworkConfigurations,
  );

  const scopedAccount = useSelector((state: RootState) => {
    if (!token) return undefined;
    return selectSelectedInternalAccountByScope(state)(
      formatChainIdToCaip(token.chainId),
    );
  });

  const evmHexBalance = useSelector((state: RootState) => {
    if (!token || !scopedAccount || isNonEvmChainId(token.chainId))
      return undefined;
    const hexChainId = formatChainIdToHex(token.chainId);
    const checksumTokenAddress = toChecksumAddress(token.address) as Hex;
    const data = selectSingleTokenBalance(
      state,
      scopedAccount.address as Hex,
      hexChainId,
      checksumTokenAddress,
    );
    return data[checksumTokenAddress];
  });

  const nonEvmBalance = useSelector((state: RootState) => {
    if (
      !token ||
      !scopedAccount ||
      !isCaipChainId(token.chainId) ||
      !isNonEvmChainId(token.chainId)
    )
      return undefined;
    return selectMultichainBalances(state)?.[scopedAccount.id]?.[token.address]
      ?.amount;
  });

  const evmTokenPrice = useSelector((state: RootState) => {
    if (!token || isNonEvmChainId(token.chainId)) return undefined;
    const hexChainId = formatChainIdToHex(token.chainId);
    const data = selectSingleTokenPriceMarketData(
      state,
      hexChainId,
      token.address as Hex,
    );
    return data[token.address as Hex]?.price;
  });

  const nonEvmAssetRate = useSelector((state: RootState) => {
    if (!token || !isNonEvmChainId(token.chainId)) return undefined;
    const assetId = token.address as CaipAssetType;
    return selectMultichainAssetsRates(state)?.[assetId]?.rate;
  });

  const resolvedBalance = useMemo(() => {
    if (!token) return;

    if (isCaipChainId(token.chainId) && isNonEvmChainId(token.chainId)) {
      return nonEvmBalance;
    }

    if (!evmHexBalance) return;
    try {
      return fromTokenMinimalUnitString(evmHexBalance, token.decimals);
    } catch {
      return;
    }
  }, [token, evmHexBalance, nonEvmBalance]);

  return useMemo(() => {
    // Reconstruct narrow objects matching calcTokenFiatValue's interface
    const evmMultiChainMarketData =
      evmTokenPrice !== undefined && token
        ? ({
            [formatChainIdToHex(token.chainId)]: {
              [token.address as Hex]: { price: evmTokenPrice },
            },
          } as Record<Hex, Record<Hex, { price: number | undefined }>>)
        : undefined;

    const nonEvmMultichainAssetRates =
      nonEvmAssetRate !== undefined && token
        ? ({
            [token.address as CaipAssetType]: { rate: nonEvmAssetRate },
          } as ReturnType<typeof selectMultichainAssetsRates>)
        : ({} as ReturnType<typeof selectMultichainAssetsRates>);

    const balanceFiat = calcTokenFiatValue({
      token: token ?? undefined,
      amount: resolvedBalance,
      evmMultiChainMarketData,
      networkConfigurationsByChainId,
      evmMultiChainCurrencyRates,
      nonEvmMultichainAssetRates,
    });
    // NB: It returns 0 both when data is missing AND when the token genuinely has zero fiat value.
    if (!balanceFiat) return;
    const usdAmount = calcUsdAmountFromFiat({
      tokenFiatValue: balanceFiat,
      chainId: token?.chainId,
      networkConfigurationsByChainId,
      evmMultiChainCurrencyRates,
    });
    if (usdAmount === undefined || !Number.isFinite(usdAmount)) return;
    return usdAmount;
  }, [
    resolvedBalance,
    token,
    evmTokenPrice,
    nonEvmAssetRate,
    networkConfigurationsByChainId,
    evmMultiChainCurrencyRates,
  ]);
};
