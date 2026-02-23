import {
  formatChainIdToCaip,
  formatChainIdToHex,
  isNonEvmChainId,
} from '@metamask/bridge-controller';
import {
  Hex,
  CaipAssetType,
  CaipChainId,
  isStrictHexString,
  isCaipChainId,
} from '@metamask/utils';
import { selectMultichainAssetsRates } from '../../../../selectors/multichain';
import { balanceToFiatNumber } from '../../../../util/number';
import { BridgeToken } from '../types';
import { handleFetch, toChecksumHexAddress } from '@metamask/controller-utils';
import {
  CodefiTokenPricesServiceV2,
  ContractMarketData,
  fetchTokenContractExchangeRates,
} from '@metamask/assets-controllers';
import { safeToChecksumAddress } from '../../../../util/address';
import { toAssetId } from '../hooks/useAssetMetadata/utils';
import { formatCurrency } from './currencyUtils';

/**
 * Converts a fiat value from the user's current currency to USD.
 * Uses the ratio of usdConversionRate / conversionRate for the chain's native
 * currency, since both rates share the same native token denominator
 * (e.g. USD/ETH ÷ EUR/ETH = USD/EUR).
 *
 * @param fiatValue - The value in the user's current fiat currency
 * @param conversionRate - Native token to user's fiat currency rate (e.g. 1 ETH = 2300 EUR)
 * @param usdConversionRate - Native token to USD rate (e.g. 1 ETH = 2500 USD)
 * @returns The value in USD, or 0 if rates are unavailable
 */
export const convertFiatToUsd = (
  fiatValue: number,
  conversionRate: number | null | undefined,
  usdConversionRate: number | null | undefined,
): number | undefined => {
  if (!conversionRate || !usdConversionRate) {
    return undefined;
  }
  return fiatValue * (usdConversionRate / conversionRate);
};

/**
 * Calculates the USD value of a token amount by converting from the user's
 * fiat currency to USD.
 *
 * Looks up the native currency for the given chain to find conversionRate and
 * usdConversionRate. For non-EVM chains (where the native currency won't exist
 * in evmMultiChainCurrencyRates), falls back to any available EVM entry since
 * the ratio usdConversionRate/conversionRate is a pure fiat-to-USD rate,
 * independent of which native token it's derived from.
 *
 * @param tokenFiatValue - The token's value in the user's current fiat currency
 * @param chainId - The chain ID of the source token
 * @param networkConfigurationsByChainId - Network configurations keyed by chain ID (includes both EVM and non-EVM chains)
 * @param evmMultiChainCurrencyRates - Currency rates keyed by native currency ticker
 * @returns The value in USD, or undefined if rates are unavailable
 */
export const calcUsdAmountFromFiat = ({
  tokenFiatValue,
  chainId,
  networkConfigurationsByChainId,
  evmMultiChainCurrencyRates,
}: {
  tokenFiatValue: number;
  chainId: string | undefined;
  networkConfigurationsByChainId: Record<string, { nativeCurrency: string }>;
  evmMultiChainCurrencyRates:
    | Record<
        string,
        { conversionRate: number | null; usdConversionRate?: number | null }
      >
    | undefined;
}): number | undefined => {
  // For EVM chains this is a ticker (e.g. "ETH", "POL"), for non-EVM chains
  // it's a full CAIP asset type (e.g. "solana:5eykt.../slip44:501")
  const nativeCurrency = chainId
    ? networkConfigurationsByChainId[chainId]?.nativeCurrency
    : undefined;

  // Try the chain's native currency first, then fall back to any entry with
  // both rates. The fallback covers non-EVM chains whose nativeCurrency
  // (a CAIP asset ID) won't exist in the EVM-only currency rates map.
  const evmChainCurrencyEntry = nativeCurrency
    ? evmMultiChainCurrencyRates?.[nativeCurrency]
    : undefined;
  const fallbackEvmCurrencyEntry = Object.values(
    evmMultiChainCurrencyRates ?? {},
  ).find((entry) => entry?.conversionRate && entry?.usdConversionRate);
  const currencyEntry = evmChainCurrencyEntry ?? fallbackEvmCurrencyEntry;
  return convertFiatToUsd(
    tokenFiatValue,
    currencyEntry?.conversionRate,
    currencyEntry?.usdConversionRate,
  );
};

export interface CalcTokenFiatValueParams {
  token: BridgeToken | undefined;
  amount: string | undefined;
  evmMultiChainMarketData:
    | Record<Hex, Record<Hex, { price: number | undefined }>>
    | undefined;
  networkConfigurationsByChainId: Record<Hex, { nativeCurrency: string }>;
  evmMultiChainCurrencyRates:
    | Record<string, { conversionRate: number | null }>
    | undefined;
  nonEvmMultichainAssetRates: ReturnType<typeof selectMultichainAssetsRates>;
}

/**
 * Calculates the fiat value of a token amount in the user's current currency
 * @returns The numeric fiat value (not formatted)
 */
export const calcTokenFiatValue = ({
  token,
  amount,
  evmMultiChainMarketData,
  networkConfigurationsByChainId,
  evmMultiChainCurrencyRates,
  nonEvmMultichainAssetRates,
}: CalcTokenFiatValueParams): number => {
  if (!token || !amount) {
    return 0;
  }

  if (isNonEvmChainId(token.chainId)) {
    const assetId = token.address as CaipAssetType;
    // This rate is asset to fiat. Whatever the user selected display fiat currency is.
    // We don't need to have an additional conversion from native token to fiat.
    const rate = nonEvmMultichainAssetRates?.[assetId]?.rate;
    if (rate) {
      return Number(balanceToFiatNumber(amount, Number(rate), 1));
    }
    return token?.currencyExchangeRate && amount
      ? Number(amount) * token?.currencyExchangeRate
      : 0;
  }

  // EVM
  const evmChainId = token.chainId as Hex;
  const evmMultiChainExchangeRates = evmMultiChainMarketData?.[evmChainId];
  const evmTokenMarketData = evmMultiChainExchangeRates?.[token.address as Hex];

  const nativeCurrency =
    networkConfigurationsByChainId[evmChainId]?.nativeCurrency;
  const multiChainConversionRate =
    evmMultiChainCurrencyRates?.[nativeCurrency]?.conversionRate;

  if (multiChainConversionRate && evmTokenMarketData?.price) {
    return Number(
      balanceToFiatNumber(
        amount,
        multiChainConversionRate,
        evmTokenMarketData.price,
      ),
    );
  }

  const currentCurrencyValue =
    token?.currencyExchangeRate && amount
      ? Number(amount) * token?.currencyExchangeRate
      : 0;

  return currentCurrencyValue;
};

interface GetDisplayCurrencyValueParams extends CalcTokenFiatValueParams {
  currentCurrency: string;
}

export const getDisplayCurrencyValue = ({
  token,
  amount,
  evmMultiChainMarketData,
  networkConfigurationsByChainId,
  evmMultiChainCurrencyRates,
  currentCurrency,
  nonEvmMultichainAssetRates,
}: GetDisplayCurrencyValueParams): string => {
  const currencyValue = calcTokenFiatValue({
    token,
    amount,
    evmMultiChainMarketData,
    networkConfigurationsByChainId,
    evmMultiChainCurrencyRates,
    nonEvmMultichainAssetRates,
  });

  if (!token || !amount) {
    return formatCurrency('0', currentCurrency);
  }

  const formattedCurrencyValue = formatCurrency(currencyValue, currentCurrency);
  if (currencyValue >= 0.01 || currencyValue === 0) {
    return formattedCurrencyValue;
  }

  return `< ${formatCurrency('0.01', currentCurrency)}`;
};

/**
 * Fetches the exchange rates for the tokens against the current currency
 * @param chainId - The chainId of the tokens
 * @param currency - The currency to fetch the exchange rates in
 * @param tokenAddresses - The addresses of the tokens to fetch the exchange rates for
 * @returns Exchange rate for the tokens against the current currency
 */
export const fetchTokenExchangeRates = async (
  chainId: Hex | CaipChainId,
  currency: string,
  ...tokenAddresses: string[]
) => {
  try {
    let exchangeRates: Record<string, number | undefined> = {};

    // Non-EVM
    if (isNonEvmChainId(chainId) && isCaipChainId(chainId)) {
      const queryParams = new URLSearchParams({
        assetIds: tokenAddresses
          .map((address) => toAssetId(address, chainId))
          .join(','),
        includeMarketData: 'true',
        vsCurrency: currency,
      });
      const url = `https://price.api.cx.metamask.io/v3/spot-prices?${queryParams}`;
      const tokenV3PriceResponse = (await handleFetch(url)) as Record<
        string,
        { price: number }
      >;

      exchangeRates = Object.entries(tokenV3PriceResponse).reduce(
        (acc, [k, curr]) => {
          acc[k] = curr.price;
          return acc;
        },
        {} as Record<string, number>,
      );
      return exchangeRates;
    }

    // EVM chains
    const checksumAddresses = tokenAddresses.map((address) =>
      safeToChecksumAddress(address),
    );
    if (checksumAddresses.some((address) => !address)) {
      return {};
    }

    exchangeRates = await fetchTokenContractExchangeRates({
      tokenPricesService: new CodefiTokenPricesServiceV2(),
      nativeCurrency: currency,
      tokenAddresses: checksumAddresses as Hex[],
      chainId: formatChainIdToHex(chainId),
    });

    return Object.keys(exchangeRates).reduce(
      (acc: Record<string, number | undefined>, address) => {
        acc[address] = exchangeRates[address];
        return acc;
      },
      {},
    );
  } catch (error) {
    return {};
  }
};

// This fetches the exchange rate for a token in a given currency. This is only called when the exchange
// rate is not available in the TokenRatesController, which happens when the selected token has not been
// imported into the wallet
export const getTokenExchangeRate = async (request: {
  chainId: Hex | CaipChainId;
  tokenAddress: string;
  currency: string;
}) => {
  const { chainId, tokenAddress, currency } = request;
  const exchangeRates = await fetchTokenExchangeRates(
    chainId,
    currency,
    tokenAddress,
  );
  const assetId = toAssetId(tokenAddress, formatChainIdToCaip(chainId));
  if (isNonEvmChainId(chainId) && assetId) {
    return exchangeRates?.[assetId];
  }
  // The exchange rate can be checksummed or not, so we need to check both
  const exchangeRate =
    exchangeRates?.[toChecksumHexAddress(tokenAddress)] ??
    exchangeRates?.[tokenAddress.toLowerCase()];
  return exchangeRate;
};

/**
 * This extracts a token's exchange rate from the marketData state object
 * These exchange rates are against the native asset of the chain
 * @param chainId - The chainId of the token
 * @param tokenAddress - The address of the token
 * @param marketData - The marketData state object
 * @returns The exchange rate of the token against the native asset of the chain
 */
export const exchangeRateFromMarketData = (
  chainId: Hex | CaipChainId,
  tokenAddress: string,
  marketData?: Record<string, ContractMarketData>,
) =>
  isStrictHexString(tokenAddress) && isStrictHexString(chainId)
    ? marketData?.[chainId]?.[tokenAddress]?.price
    : undefined;
