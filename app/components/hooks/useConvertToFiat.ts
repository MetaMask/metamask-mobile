import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { isCaipAssetType, type Hex } from '@metamask/utils';
import type { RootState } from '../../reducers';
import {
  selectConversionRateByChainId,
  selectUSDConversionRateByChainId,
} from '../../selectors/currencyRateController';
import { selectMultichainAssetsRates } from '../../selectors/multichain';
import { selectContractExchangeRatesByChainId } from '../../selectors/tokenRatesController';
import { safeToChecksumAddress } from '../../util/address';
import {
  getHumanReadableTokenAmount,
  toMarketRateLookupToken,
  type TokenAmount,
} from '../../util/activity-adapters';
import type { MarketRateLookupToken } from '../../util/activity-adapters/fiat';
import { getMaybeHexChainId } from '../../util/bridge';
import { balanceToFiatNumber } from '../../util/number/bigint';
import {
  MUSD_DECIMALS,
  MUSD_TOKEN,
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
} from '@metamask/money-account-utils';

function getPositiveRate(value: unknown): number | undefined {
  const rate = Number(value);
  if (Number.isFinite(rate) && rate > 0) {
    return rate;
  }
  return undefined;
}

function isNativeAsset(token: TokenAmount): boolean {
  return Boolean(
    token.assetId?.includes('/slip44:') || token.assetId?.includes('/native:'),
  );
}

function getMusdMarketRateToken(
  token: TokenAmount,
  hexChainId: Hex,
): MarketRateLookupToken | undefined {
  if (
    token.symbol !== MUSD_TOKEN.symbol ||
    !MUSD_TOKEN_ADDRESS_BY_CHAIN[hexChainId]
  ) {
    return undefined;
  }

  return {
    address: MUSD_TOKEN_ADDRESS_BY_CHAIN[hexChainId].toLowerCase(),
    symbol: MUSD_TOKEN.symbol,
    decimals: token.decimals ?? MUSD_DECIMALS,
    chainId: hexChainId,
  };
}

function getMusdNativeExchangeRate({
  usdConversionRate,
}: {
  usdConversionRate: number | null | undefined;
}): number | undefined {
  if (!usdConversionRate) {
    return undefined;
  }

  return 1 / usdConversionRate;
}

function getMarketPriceForAddress(
  contractExchangeRates:
    | Record<string, { price?: number | null } | undefined>
    | undefined,
  address: string,
): number | null | undefined {
  if (!contractExchangeRates) return undefined;

  const checksum = safeToChecksumAddress(address);
  if (checksum) {
    const price = contractExchangeRates[checksum]?.price;
    if (price !== undefined && price !== null) return price;
  }

  const lower = address.toLowerCase();
  const key = Object.keys(contractExchangeRates).find(
    (k) => k.toLowerCase() === lower,
  );
  return key !== undefined ? contractExchangeRates[key]?.price : undefined;
}

export function useConvertToFiat(chainId?: string) {
  const hexChainId = getMaybeHexChainId(chainId);
  const conversionRate = useSelector((state: RootState) =>
    hexChainId
      ? selectConversionRateByChainId(state, hexChainId, true)
      : undefined,
  );
  const contractExchangeRates = useSelector((state: RootState) =>
    hexChainId
      ? selectContractExchangeRatesByChainId(state, hexChainId)
      : undefined,
  );
  const usdConversionRate = useSelector((state: RootState) =>
    hexChainId
      ? selectUSDConversionRateByChainId(state, hexChainId)
      : undefined,
  );
  const multichainAssetRates = useSelector(selectMultichainAssetsRates);

  return useCallback(
    (token: TokenAmount | undefined): number | undefined => {
      if (!token || token.isUnlimitedApproval) {
        return undefined;
      }

      const humanAmount = getHumanReadableTokenAmount(token);
      if (humanAmount === undefined) {
        return undefined;
      }

      const quantity = Number.parseFloat(humanAmount);
      if (!Number.isFinite(quantity)) {
        return undefined;
      }

      const multichainRate =
        token.assetId && isCaipAssetType(token.assetId)
          ? getPositiveRate(multichainAssetRates[token.assetId]?.rate)
          : undefined;
      if (multichainRate !== undefined) {
        return balanceToFiatNumber(quantity, multichainRate, 1);
      }

      if (!hexChainId) {
        return undefined;
      }

      const lookupToken =
        toMarketRateLookupToken(token, hexChainId) ??
        getMusdMarketRateToken(token, hexChainId);
      const exchangeRate = isNativeAsset(token)
        ? 1
        : lookupToken
          ? (getMarketPriceForAddress(
              contractExchangeRates,
              lookupToken.address,
            ) ??
            (lookupToken.symbol === MUSD_TOKEN.symbol
              ? getMusdNativeExchangeRate({ usdConversionRate })
              : undefined))
          : undefined;

      if (!conversionRate || !exchangeRate) {
        return undefined;
      }

      return balanceToFiatNumber(quantity, conversionRate, exchangeRate);
    },
    [
      contractExchangeRates,
      conversionRate,
      hexChainId,
      multichainAssetRates,
      usdConversionRate,
    ],
  );
}
