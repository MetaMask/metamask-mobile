import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Hex,
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  CaipAssetType,
  isCaipChainId,
  ///: END:ONLY_INCLUDE_IF
} from '@metamask/utils';
import I18n from '../../../../../locales/i18n';
import {
  selectNativeCurrencyByChainId,
  selectSelectedNetworkClientId,
} from '../../../../selectors/networkController';
import {
  selectCurrentCurrency,
  selectCurrencyRates,
} from '../../../../selectors/currencyRateController';
import { selectAccountsByChainId } from '../../../../selectors/accountTrackerController';
import { selectTokensBalances } from '../../../../selectors/tokenBalancesController';
import {
  selectSelectedInternalAccount,
  selectSelectedInternalAccountFormattedAddress,
} from '../../../../selectors/accountsController';
import { safeToChecksumAddress } from '../../../../util/address';
import {
  renderFromTokenMinimalUnit,
  renderFromWei,
  toHexadecimal,
  addCurrencySymbol,
  balanceToFiatNumber,
} from '../../../../util/number';
import useTokenHistoricalPrices, {
  TimePeriod,
  TokenPrice,
} from '../../../hooks/useTokenHistoricalPrices';
import { RootState } from '../../../../reducers';
import { selectPerpsEnabledFlag } from '../../Perps';
import { selectMerklCampaignClaimingEnabledFlag } from '../../Earn/selectors/featureFlags';
import { TokenI } from '../../Tokens/types';
import {
  isAssetFromSearch,
  selectTokenDisplayData,
} from '../../../../selectors/tokenSearchDiscoveryDataController';
import { formatWithThreshold } from '../../../../util/assets';
import { calculateAssetPrice } from '../../AssetOverview/utils/calculateAssetPrice';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { selectMultichainAssetsRates } from '../../../../selectors/multichain';
import { isEvmAccountType, KeyringAccountType } from '@metamask/keyring-api';
///: END:ONLY_INCLUDE_IF
import { selectMultichainAccountsState2Enabled } from '../../../../selectors/featureFlagController/multichainAccounts';
import { selectTokenMarketData } from '../../../../selectors/tokenRatesController';
import { getTokenExchangeRate } from '../../Bridge/utils/exchange-rates';
import { isNonEvmChainId } from '../../../../core/Multichain/utils';
import { useRampTokens } from '../../Ramp/hooks/useRampTokens';
import { toAssetId } from '../../Bridge/hooks/useAssetMetadata/utils';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { parseCAIP19AssetId } from '../../Ramp/Aggregator/utils/parseCaip19AssetId';
import { toLowerCaseEquals } from '../../../../util/general';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
///: BEGIN:ONLY_INCLUDE_IF(tron)
import {
  selectTronResourcesBySelectedAccountGroup,
  selectAsset,
} from '../../../../selectors/assets/assets-list';
import { createStakedTrxAsset } from '../../AssetOverview/utils/createStakedTrxAsset';
///: END:ONLY_INCLUDE_IF

export interface UseTokenDetailsDataResult {
  // Balance
  balance: string | number | undefined;
  mainBalance: string;
  secondaryBalance: string | undefined;

  // Price
  currentPrice: number;
  priceDiff: number;
  comparePrice: number;
  prices: TokenPrice[];
  isLoading: boolean;

  // Time period
  timePeriod: TimePeriod;
  setTimePeriod: (period: TimePeriod) => void;
  chartNavigationButtons: TimePeriod[];

  // Feature flags
  isPerpsEnabled: boolean;
  isMerklCampaignClaimingEnabled: boolean;

  // Display flags
  isAssetBuyable: boolean;

  // Asset state
  isNonEvmAsset: boolean;
  nativeCurrency: string;
  currentCurrency: string;

  // Tron-specific (optional)
  isTronNative?: boolean;
  stakedTrxAsset?: TokenI;
}

/**
 * Hook that consolidates all token data fetching for the TokenDetails view.
 * Extracts balance calculation, price data, and feature flags from AssetOverview.
 */
export const useTokenDetailsData = (
  asset: TokenI,
): UseTokenDetailsDataResult => {
  // Determine if asset is EVM or non-EVM
  const resultChainId = formatChainIdToCaip(asset.chainId as Hex);
  const isNonEvmAsset = resultChainId === asset.chainId;

  // Time period state
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('1d');

  // Selectors
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);
  const selectedInternalAccountAddress = selectedInternalAccount?.address;
  const conversionRateByTicker = useSelector(selectCurrencyRates);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const accountsByChainId = useSelector(selectAccountsByChainId);
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const allTokenMarketData = useSelector(selectTokenMarketData);
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const isMerklCampaignClaimingEnabled = useSelector(
    selectMerklCampaignClaimingEnabledFlag,
  );

  const nativeCurrency = useSelector((state: RootState) =>
    selectNativeCurrencyByChainId(state, asset.chainId as Hex),
  );

  const multiChainTokenBalance = useSelector(selectTokensBalances);
  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );

  const chainId = asset.chainId as Hex;
  const selectedNetworkClientId = useSelector(selectSelectedNetworkClientId);
  const tokenResult = useSelector((state: RootState) =>
    selectTokenDisplayData(state, asset.chainId as Hex, asset.address as Hex),
  );

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const multichainAssetsRates = useSelector(selectMultichainAssetsRates);
  const multichainAssetRates =
    multichainAssetsRates?.[asset.address as CaipAssetType];
  ///: END:ONLY_INCLUDE_IF

  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  const tronResources = useSelector(selectTronResourcesBySelectedAccountGroup);
  const strxEnergy = tronResources.find(
    (a) => a.symbol.toLowerCase() === 'strx-energy',
  );
  const strxBandwidth = tronResources.find(
    (a) => a.symbol.toLowerCase() === 'strx-bandwidth',
  );

  const isTronChain = String(asset.chainId).startsWith('tron:');
  const liveAsset = useSelector((state: RootState) =>
    isTronChain && asset.address && asset.chainId
      ? selectAsset(state, {
          address: asset.address,
          chainId: asset.chainId,
          isStaked: false,
        })
      : undefined,
  );
  ///: END:ONLY_INCLUDE_IF

  const currentAddress = asset.address as Hex;

  // Historical prices
  const { data: prices = [], isLoading } = useTokenHistoricalPrices({
    asset,
    address: currentAddress,
    chainId,
    timePeriod,
    vsCurrency: currentCurrency,
  });

  // Fetch swaps tokens on mount
  useEffect(() => {
    const { SwapsController } = Engine.context;
    const fetchTokenWithCache = async () => {
      try {
        await SwapsController.fetchTokenWithCache({
          networkClientId: selectedNetworkClientId,
        });
      } catch (error) {
        Logger.error(
          error as Error,
          'Swaps: error while fetching tokens with cache in useTokenDetailsData',
        );
      }
    };
    fetchTokenWithCache();
  }, [selectedNetworkClientId]);

  // Chart navigation buttons based on asset type
  const chartNavigationButtons: TimePeriod[] = useMemo(
    () =>
      !isNonEvmAsset
        ? ['1d', '1w', '1m', '3m', '1y', '3y']
        : ['1d', '1w', '1m', '3m', '1y', 'all'],
    [isNonEvmAsset],
  );

  // Calculate item address
  const itemAddress = !isNonEvmAsset
    ? safeToChecksumAddress(asset.address)
    : asset.address;

  const currentChainId = chainId as Hex;
  const marketDataRate =
    allTokenMarketData?.[currentChainId]?.[itemAddress as Hex]?.price;

  // Fetch exchange rate if not available in cache
  const [fetchedRate, setFetchedRate] = useState<number | undefined>();

  useEffect(() => {
    if (marketDataRate !== undefined || !itemAddress) {
      return;
    }

    const isNonEvm = isNonEvmChainId(currentChainId);
    const nativeAssetConversionRate =
      nativeCurrency &&
      conversionRateByTicker?.[nativeCurrency]?.conversionRate;

    if (!isNonEvm && !nativeAssetConversionRate) {
      return;
    }

    const fetchRate = async () => {
      try {
        const tokenFiatPrice = await getTokenExchangeRate({
          chainId: currentChainId,
          tokenAddress: itemAddress,
          currency: currentCurrency,
        });

        if (!tokenFiatPrice) {
          setFetchedRate(undefined);
          return;
        }

        if (isNonEvm) {
          setFetchedRate(tokenFiatPrice);
        } else if (nativeAssetConversionRate) {
          setFetchedRate(tokenFiatPrice / nativeAssetConversionRate);
        }
      } catch (error) {
        console.error('Failed to fetch token exchange rate:', error);
        setFetchedRate(undefined);
      }
    };

    fetchRate();
  }, [
    currentChainId,
    itemAddress,
    currentCurrency,
    marketDataRate,
    nativeCurrency,
    conversionRateByTicker,
  ]);

  const exchangeRate = marketDataRate ?? fetchedRate;

  // Calculate balance
  let balance: string | number | undefined;
  const minimumDisplayThreshold = 0.00001;
  const isMultichainAsset = isNonEvmAsset;
  const isEthOrNative = asset.isETH || asset.isNative;

  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  const isTronNative =
    asset.ticker === 'TRX' && String(asset.chainId).startsWith('tron:');

  const stakedTrxAsset = isTronNative
    ? createStakedTrxAsset(asset, strxEnergy?.balance, strxBandwidth?.balance)
    : undefined;
  ///: END:ONLY_INCLUDE_IF

  // Determine balance source
  let balanceSource = asset.balance;
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  if (isTronChain && liveAsset?.balance != null) {
    balanceSource = liveAsset.balance;
  }
  ///: END:ONLY_INCLUDE_IF

  if (isMultichainAccountsState2Enabled && balanceSource != null) {
    balance = balanceSource;
  } else if (isMultichainAsset) {
    balance = balanceSource
      ? formatWithThreshold(
          parseFloat(balanceSource),
          minimumDisplayThreshold,
          I18n.locale,
          { minimumFractionDigits: 0, maximumFractionDigits: 5 },
        )
      : undefined;
  } else if (isEthOrNative) {
    balance = renderFromWei(
      // @ts-expect-error - This should be fixed at the accountsController selector level
      accountsByChainId[toHexadecimal(chainId)]?.[selectedAddress]?.balance,
    );
  } else {
    const multiChainTokenBalanceHex =
      itemAddress &&
      multiChainTokenBalance?.[selectedInternalAccountAddress as Hex]?.[
        chainId as Hex
      ]?.[itemAddress as Hex];
    const tokenBalanceHex = multiChainTokenBalanceHex;
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    if (
      !isEvmAccountType(selectedInternalAccount?.type as KeyringAccountType)
    ) {
      balance = asset.balance ?? undefined;
    } else {
      ///: END:ONLY_INCLUDE_IF
      balance =
        itemAddress && tokenBalanceHex
          ? renderFromTokenMinimalUnit(tokenBalanceHex, asset.decimals)
          : (asset.balance ?? undefined);
      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    }
    ///: END:ONLY_INCLUDE_IF
  }

  // Calculate multichain asset rates for price calculation
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const convertedMultichainAssetRates =
    isNonEvmAsset && multichainAssetRates
      ? {
          rate: Number(multichainAssetRates.rate),
          marketData: undefined,
        }
      : undefined;
  ///: END:ONLY_INCLUDE_IF

  // Calculate price data
  let currentPrice = 0;
  let priceDiff = 0;
  let comparePrice = 0;

  if (isAssetFromSearch(asset) && tokenResult?.found) {
    currentPrice = tokenResult.price?.price || 0;
  } else {
    const {
      currentPrice: calculatedPrice,
      priceDiff: calculatedPriceDiff,
      comparePrice: calculatedComparePrice,
    } = calculateAssetPrice({
      _asset: asset,
      isEvmAssetSelected: !isNonEvmAsset,
      exchangeRate,
      tickerConversionRate:
        conversionRateByTicker?.[nativeCurrency]?.conversionRate ?? undefined,
      prices,
      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      multichainAssetRates: convertedMultichainAssetRates,
      ///: END:ONLY_INCLUDE_IF
      timePeriod,
    });
    currentPrice = calculatedPrice;
    priceDiff = calculatedPriceDiff;
    comparePrice = calculatedComparePrice;
  }

  // Calculate fiat balance
  let balanceFiatSource = asset.balanceFiat;
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  if (isTronChain && liveAsset?.balanceFiat != null) {
    balanceFiatSource = liveAsset.balanceFiat;
  }
  ///: END:ONLY_INCLUDE_IF

  let mainBalance = balanceFiatSource || '';
  if (!mainBalance && balance != null) {
    const balanceNumber =
      typeof balance === 'number' ? balance : parseFloat(String(balance));

    if (balanceNumber > 0 && !isNaN(balanceNumber)) {
      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      if (isNonEvmAsset && multichainAssetRates?.rate) {
        const rate = Number(multichainAssetRates.rate);
        const balanceFiatNumber = balanceNumber * rate;
        mainBalance =
          balanceFiatNumber >= 0.01 || balanceFiatNumber === 0
            ? addCurrencySymbol(balanceFiatNumber, currentCurrency)
            : `< ${addCurrencySymbol('0.01', currentCurrency)}`;
      } else if (!isNonEvmAsset) {
        ///: END:ONLY_INCLUDE_IF
        const tickerConversionRate =
          conversionRateByTicker?.[nativeCurrency]?.conversionRate;

        if (
          tickerConversionRate &&
          marketDataRate !== undefined &&
          isFinite(marketDataRate)
        ) {
          const balanceFiatNumber = balanceToFiatNumber(
            balanceNumber,
            tickerConversionRate,
            marketDataRate,
          );
          if (isFinite(balanceFiatNumber)) {
            mainBalance =
              balanceFiatNumber >= 0.01 || balanceFiatNumber === 0
                ? addCurrencySymbol(balanceFiatNumber, currentCurrency)
                : `< ${addCurrencySymbol('0.01', currentCurrency)}`;
          }
        }
        ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      }
      ///: END:ONLY_INCLUDE_IF
    }
  }

  const secondaryBalance =
    balance != null
      ? `${balance} ${asset.isETH ? asset.ticker : asset.symbol}`
      : undefined;

  // Check if asset is buyable
  const { allTokens } = useRampTokens();

  const isAssetBuyable = useMemo(() => {
    if (!allTokens) return false;

    const chainIdInCaip = isCaipChainId(asset.chainId)
      ? asset.chainId
      : toEvmCaipChainId(asset.chainId as Hex);
    const assetId = toAssetId(asset.address, chainIdInCaip);

    const matchingToken = allTokens.find((token) => {
      if (!token.assetId) return false;

      const parsedTokenAssetId = parseCAIP19AssetId(token.assetId);
      if (!parsedTokenAssetId) return false;

      if (asset.isNative) {
        return (
          token.chainId === chainIdInCaip &&
          parsedTokenAssetId.assetNamespace === 'slip44'
        );
      }

      return assetId && toLowerCaseEquals(token.assetId, assetId);
    });
    return matchingToken?.tokenSupported ?? false;
  }, [allTokens, asset.isNative, asset.chainId, asset.address]);

  return {
    // Balance
    balance,
    mainBalance,
    secondaryBalance,

    // Price
    currentPrice,
    priceDiff,
    comparePrice,
    prices,
    isLoading,

    // Time period
    timePeriod,
    setTimePeriod,
    chartNavigationButtons,

    // Feature flags
    isPerpsEnabled,
    isMerklCampaignClaimingEnabled,

    // Display flags
    isAssetBuyable,

    // Asset state
    isNonEvmAsset,
    nativeCurrency,
    currentCurrency,

    // Tron-specific
    ///: BEGIN:ONLY_INCLUDE_IF(tron)
    isTronNative,
    stakedTrxAsset,
    ///: END:ONLY_INCLUDE_IF
  };
};

export default useTokenDetailsData;
