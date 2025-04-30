import { formatChainIdToHex, isSolanaChainId } from '@metamask/bridge-controller';
import { Hex, CaipAssetType, CaipChainId } from '@metamask/utils';
import { selectMultichainAssetsRates } from '../../../../selectors/multichain';
import {
  addCurrencySymbol,
  balanceToFiatNumber,
} from '../../../../util/number';
import { BridgeToken } from '../types';
import { handleFetch } from '@metamask/controller-utils';
import { CodefiTokenPricesServiceV2, fetchTokenContractExchangeRates } from '@metamask/assets-controllers';
import { safeToChecksumAddress } from '../../../../util/address';
import { SolScope } from '@metamask/keyring-api';
import { toAssetId } from '../hooks/useAssetMetadata/utils';

interface GetDisplayFiatValueParams {
  token: BridgeToken | undefined;
  amount: string | undefined;
  multiChainMarketData:
    | Record<Hex, Record<Hex, { price: number | undefined }>>
    | undefined;
  networkConfigurationsByChainId: Record<Hex, { nativeCurrency: string }>;
  multiChainCurrencyRates:
    | Record<string, { conversionRate: number | null }>
    | undefined;
  currentCurrency: string;
  nonEvmMultichainAssetRates: ReturnType<typeof selectMultichainAssetsRates>;
}

export const getDisplayFiatValue = ({
  token,
  amount,
  multiChainMarketData, // EVM
  networkConfigurationsByChainId,
  multiChainCurrencyRates, // EVM
  currentCurrency,
  nonEvmMultichainAssetRates, // Non-EVM
}: GetDisplayFiatValueParams): string => {
  if (!token || !amount) {
    return addCurrencySymbol('0', currentCurrency);
  }

  let balanceFiatCalculation = 0;

  if (isSolanaChainId(token.chainId)) {
    const assetId = token.address as CaipAssetType;
    // This rate is asset to fiat. Whatever the user selected display fiat currency is.
    // We don't need to have an additional conversion from native token to fiat.
    const rate = nonEvmMultichainAssetRates?.[assetId]?.rate || '0';
    balanceFiatCalculation = Number(
      balanceToFiatNumber(amount, Number(rate), 1),
    );
  } else {
    // EVM
    const evmChainId = token.chainId as Hex;
    const multiChainExchangeRates = multiChainMarketData?.[evmChainId];
    const tokenMarketData = multiChainExchangeRates?.[token.address as Hex];

    const nativeCurrency =
      networkConfigurationsByChainId[evmChainId]?.nativeCurrency;
    const multiChainConversionRate =
      multiChainCurrencyRates?.[nativeCurrency]?.conversionRate ?? 0;

    balanceFiatCalculation = Number(
      balanceToFiatNumber(
        amount,
        multiChainConversionRate,
        tokenMarketData?.price ?? 0,
      ),
    );
  }

  if (balanceFiatCalculation >= 0.01 || balanceFiatCalculation === 0) {
    return addCurrencySymbol(balanceFiatCalculation, currentCurrency);
  }

  return `< ${addCurrencySymbol('0.01', currentCurrency)}`;
};

export const fetchTokenExchangeRates = async (
  chainId: Hex | CaipChainId,
  currency: string,
  ...tokenAddresses: string[]
) => {
  let exchangeRates: Record<string, number | undefined> = {};

  // Solana
  if (isSolanaChainId(chainId)) {
    const queryParams = new URLSearchParams({
      assetIds: tokenAddresses
        .map((address) => toAssetId(address, SolScope.Mainnet))
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
  const checksumAddresses = tokenAddresses.map((address) => safeToChecksumAddress(address));
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
};
