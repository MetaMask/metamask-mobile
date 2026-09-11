import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import { ListRenderItemInfo, Pressable } from 'react-native';
import { FlatList, ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import BigNumber from 'bignumber.js';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  AvatarBaseShape,
  AvatarNetwork,
  AvatarNetworkSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  HeaderStandard,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  formatAddressToAssetId,
  formatChainIdToCaip,
  formatChainIdToHex,
  isNativeAddress,
  isNonEvmChainId,
  BatchSellMetricsLocation,
} from '@metamask/bridge-controller';
import { CaipAssetType, CaipChainId, Hex } from '@metamask/utils';
import { NetworkConfiguration } from '@metamask/network-controller';

import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import {
  resetBridgeState,
  selectBatchSellDestStablecoins,
  selectBatchSellSourceTokens,
  setBatchSellDestToken,
  setBatchSellSourceTokenAmounts,
  setBatchSellSourceTokens,
  setBatchSellTokenSlippages,
} from '../../../../../core/redux/slices/bridge';
import { RootState } from '../../../../../reducers';
import {
  selectEvmNetworkConfigurationsByChainId,
  selectNativeCurrencyByChainId,
} from '../../../../../selectors/networkController';
import {
  selectIsEvmNetworkSelected,
  selectSelectedNonEvmNetworkChainId,
} from '../../../../../selectors/multichainNetworkController';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';
import { selectTokenMarketData } from '../../../../../selectors/tokenRatesController';
import { selectMultichainAssetsRates } from '../../../../../selectors/multichain/multichain';
import { useNetworkInfo } from '../../../../../selectors/selectedNetworkController';
import { useSwitchNetworks } from '../../../../Views/NetworkSelector/useSwitchNetworks';
import { BridgeToken } from '../../types';
import ButtonToggle from '../../../../../component-library/components-temp/Buttons/ButtonToggle';
import { ButtonSize as ButtonToggleSize } from '../../../../../component-library/components/Buttons/Button';
import { getNetworkImageSource } from '../../../../../util/networks';
import {
  buildBatchSellEligibleChains,
  getBatchSellDestinationToken,
  MAX_BATCH_SELL_SOURCE_TOKENS,
  BatchSellTokenSortDirection,
  sortBatchSellTokens,
} from './BatchSellTokenSelect.utils';
import { BatchSellTokenSelectSelectorsIDs } from './BatchSellTokenSelect.testIds';
import { BatchSellTokenRow } from './BatchSellTokenRow';
import { BatchSellEmptyState } from './BatchSellEmptyState';
import { DEFAULT_BATCH_SELL_SLIPPAGE } from '../../components/SlippageModal/utils';
import { normalizeTokenAddress } from '../../utils/tokenUtils';
import { useBatchSellTokens } from './useBatchSellTokens';
import { useRefreshSmartTransactionsLiveness } from '../../../../hooks/useRefreshSmartTransactionsLiveness';
import { useTrackBatchSellTokenPageViewed } from '../../hooks/useTrackBatchSellTokenPageViewed';
import { useTrackBatchSellTokenPageContinueClicked } from '../../hooks/useTrackBatchSellTokenPageContinueClicked';
import type { BatchSellTokenSelectRouteParams } from './types';
import { safeToChecksumAddress } from '../../../../../util/address';
import { formatPriceWithSubscriptNotation } from '../../../Predict/utils/format';

const getTokenKey = (token: BridgeToken) =>
  `${formatChainIdToCaip(token.chainId)}:${normalizeTokenAddress(
    token.address,
    token.chainId,
  )}`;

function getBatchSellSourceTokenAmount(token: BridgeToken, percent: number) {
  if (percent <= 0) return '0';
  if (!token.balance) return undefined;

  const sourceAmount = new BigNumber(token.balance).times(percent).div(100);

  return sourceAmount.isFinite() ? sourceAmount.toFixed() : undefined;
}

function getDefaultBatchSellSlippages(selectedTokens: BridgeToken[]) {
  return selectedTokens.reduce<Partial<Record<CaipAssetType, string>>>(
    (slippagesByAssetId, token) => {
      const assetId = formatAddressToAssetId(token.address, token.chainId);

      if (assetId) {
        slippagesByAssetId[assetId] = DEFAULT_BATCH_SELL_SLIPPAGE;
      }

      return slippagesByAssetId;
    },
    {},
  );
}

function getDefaultBatchSellSourceTokenAmounts(selectedTokens: BridgeToken[]) {
  return selectedTokens.reduce<Partial<Record<CaipAssetType, string>>>(
    (sourceAmountsByAssetId, token) => {
      const assetId = formatAddressToAssetId(token.address, token.chainId);
      const amount = getBatchSellSourceTokenAmount(token, 100);

      if (assetId) {
        sourceAmountsByAssetId[assetId] = amount;
      }

      return sourceAmountsByAssetId;
    },
    {},
  );
}

function getPricePercentChangeText(
  pricePercentChange: number | undefined,
): string | undefined {
  if (
    pricePercentChange === undefined ||
    !Number.isFinite(pricePercentChange)
  ) {
    return undefined;
  }

  return `${pricePercentChange >= 0 ? '+' : ''}${pricePercentChange.toFixed(
    2,
  )}%`;
}

function getPricePercentChangeTextColor(pricePercentChange: number): TextColor {
  if (pricePercentChange > 0) {
    return TextColor.SuccessDefault;
  }

  if (pricePercentChange < 0) {
    return TextColor.ErrorDefault;
  }

  return TextColor.TextAlternative;
}

function getTokenPriceInFiat({
  token,
  chainId,
  isNative,
  tokenMarketData,
  currencyRates,
  nativeCurrency,
}: {
  token: BridgeToken;
  chainId: Hex;
  isNative: boolean;
  tokenMarketData: ReturnType<typeof selectTokenMarketData>;
  currencyRates: ReturnType<typeof selectCurrencyRates>;
  nativeCurrency?: string;
}): number | undefined {
  const addressToUse = isNative
    ? getNativeTokenAddress(chainId)
    : safeToChecksumAddress(token.address);
  const marketPriceInNative =
    tokenMarketData?.[chainId]?.[addressToUse as Hex]?.price;

  if (marketPriceInNative != null) {
    const nativeToFiatRate = nativeCurrency
      ? currencyRates?.[nativeCurrency]?.conversionRate
      : undefined;

    return nativeToFiatRate
      ? marketPriceInNative * nativeToFiatRate
      : undefined;
  }

  const nativePriceInFiat = isNative
    ? currencyRates?.[token.symbol]?.conversionRate
    : undefined;

  return nativePriceInFiat ?? undefined;
}

function getTokenPricePercentChange({
  token,
  chainId,
  isNative,
  tokenMarketData,
  multichainAssetsRates,
}: {
  token: BridgeToken;
  chainId: Hex;
  isNative: boolean;
  tokenMarketData: ReturnType<typeof selectTokenMarketData>;
  multichainAssetsRates: ReturnType<typeof selectMultichainAssetsRates>;
}): number | undefined {
  const tokenPercentageChange = token.address
    ? tokenMarketData?.[chainId]?.[token.address as Hex]?.pricePercentChange1d
    : undefined;
  const evmPricePercentChange1d = isNative
    ? tokenMarketData?.[chainId]?.[getNativeTokenAddress(chainId) as Hex]
        ?.pricePercentChange1d
    : tokenPercentageChange;
  const multichainPricePercentChange =
    multichainAssetsRates?.[token.address as CaipAssetType]?.marketData
      ?.pricePercentChange?.P1D;

  return multichainPricePercentChange ?? evmPricePercentChange1d;
}

interface TokenPriceDisplay {
  tokenPriceText?: string;
  pricePercentChangeText?: string;
  pricePercentChangeTextColor?: TextColor;
}

const EMPTY_TOKEN_PRICE_DISPLAY: TokenPriceDisplay = {};

export function BatchSellTokenSelect() {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<
    RouteProp<
      {
        BatchSellTokenSelect: BatchSellTokenSelectRouteParams | undefined;
      },
      'BatchSellTokenSelect'
    >
  >();
  const dispatch = useDispatch();
  const tw = useTailwind();
  const evmNetworkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const isEvmNetworkSelected = useSelector(selectIsEvmNetworkSelected);
  const selectedNonEvmNetworkChainId = useSelector(
    selectSelectedNonEvmNetworkChainId,
  );
  const {
    chainId: selectedEvmChainId,
    domainIsConnectedDapp,
    networkName: selectedEvmNetworkName,
  } = useNetworkInfo();
  const { onSetRpcTarget, onNonEvmNetworkChange } = useSwitchNetworks({
    domainIsConnectedDapp,
    selectedChainId: selectedEvmChainId,
    selectedNetworkName: selectedEvmNetworkName,
  });
  const currentChainId = isEvmNetworkSelected
    ? selectedEvmChainId
    : selectedNonEvmNetworkChainId;
  const batchSellTokens = useBatchSellTokens();
  const [tokenSortDirection, setTokenSortDirection] =
    useState<BatchSellTokenSortDirection>('desc');
  const sortedEligibleSourceTokens = useMemo(
    () => sortBatchSellTokens(batchSellTokens, tokenSortDirection),
    [batchSellTokens, tokenSortDirection],
  );
  const sortedEligibleChains = useMemo(
    () => buildBatchSellEligibleChains(sortedEligibleSourceTokens),
    [sortedEligibleSourceTokens],
  );
  const batchSellLocation =
    route.params?.batchSellLocation ?? BatchSellMetricsLocation.Unknown;
  const preserveBridgeState = route.params?.preserveBridgeState === true;

  useLayoutEffect(() => {
    Engine.context.BridgeController.setLocation(batchSellLocation);
  }, [batchSellLocation]);

  useTrackBatchSellTokenPageViewed({
    location: batchSellLocation,
    sortedEligibleChains,
  });
  const trackBatchSellTokenPageContinueClicked =
    useTrackBatchSellTokenPageContinueClicked({
      location: batchSellLocation,
    });

  const [selectedChainId, setSelectedChainId] = useState<
    CaipChainId | undefined
  >(() => sortedEligibleChains[0]?.chainId);
  const [selectedTokens, setSelectedTokens] = useState<BridgeToken[]>([]);
  const committedSourceTokens = useSelector(selectBatchSellSourceTokens);

  useEffect(() => {
    if (preserveBridgeState) {
      return;
    }

    dispatch(resetBridgeState());
  }, [dispatch, preserveBridgeState]);

  useEffect(() => {
    // Tokens can be removed on the review page, which only updates Redux. Keep the
    // local selection in sync so removed tokens appear deselected when returning here.
    if (committedSourceTokens.length === 0) {
      return;
    }

    const committedTokenKeys = new Set(committedSourceTokens.map(getTokenKey));

    setSelectedTokens((tokens) => {
      const reconciledTokens = tokens.filter((token) =>
        committedTokenKeys.has(getTokenKey(token)),
      );

      return reconciledTokens.length === tokens.length
        ? tokens
        : reconciledTokens;
    });
  }, [committedSourceTokens]);

  useEffect(() => {
    // Default to the highest-value chain once balances load, but preserve a
    // user-selected chain for as long as it remains eligible.
    const highestValueChain = sortedEligibleChains[0];

    if (!highestValueChain) {
      return;
    }

    const isSelectedChainEligible = sortedEligibleChains.some(
      (chain) => chain.chainId === selectedChainId,
    );

    if (isSelectedChainEligible) {
      return;
    }

    setSelectedChainId(highestValueChain.chainId);
    setSelectedTokens([]);
  }, [selectedChainId, sortedEligibleChains]);

  const activeChainId = selectedChainId ?? sortedEligibleChains[0]?.chainId;
  const activeHexChainId = activeChainId
    ? formatChainIdToHex(activeChainId)
    : undefined;
  const tokenMarketData = useSelector(selectTokenMarketData);
  const currencyRates = useSelector(selectCurrencyRates);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const multichainAssetsRates = useSelector(selectMultichainAssetsRates);
  const activeChainNativeCurrency = useSelector((state: RootState) =>
    activeHexChainId
      ? selectNativeCurrencyByChainId(state, activeHexChainId)
      : undefined,
  );

  // Fetch STX liveness for the active batch sell source chain
  useRefreshSmartTransactionsLiveness(activeChainId);

  const destinationStablecoins = useSelector((state: RootState) =>
    selectBatchSellDestStablecoins(state, activeChainId),
  );
  const selectedChainTokens = useMemo(
    () =>
      activeChainId
        ? sortedEligibleSourceTokens.filter(
            (token) => formatChainIdToCaip(token.chainId) === activeChainId,
          )
        : sortedEligibleSourceTokens,
    [activeChainId, sortedEligibleSourceTokens],
  );
  const tokenPriceDisplayByKey = useMemo(() => {
    const priceDisplayByKey = new Map<string, TokenPriceDisplay>();

    for (const token of selectedChainTokens) {
      const chainId = formatChainIdToHex(token.chainId);
      const isNative = isNativeAddress(token.address);
      const tokenPriceInFiat = getTokenPriceInFiat({
        token,
        chainId,
        isNative,
        tokenMarketData,
        currencyRates,
        nativeCurrency: activeChainNativeCurrency,
      });
      const tokenPriceText =
        tokenPriceInFiat !== undefined
          ? formatPriceWithSubscriptNotation(tokenPriceInFiat, currentCurrency)
          : undefined;
      const pricePercentChange = getTokenPricePercentChange({
        token,
        chainId,
        isNative,
        tokenMarketData,
        multichainAssetsRates,
      });
      const pricePercentChangeText =
        getPricePercentChangeText(pricePercentChange);
      const pricePercentChangeTextColor =
        pricePercentChangeText && pricePercentChange !== undefined
          ? getPricePercentChangeTextColor(pricePercentChange)
          : undefined;

      priceDisplayByKey.set(getTokenKey(token), {
        tokenPriceText,
        pricePercentChangeText,
        pricePercentChangeTextColor,
      });
    }

    return priceDisplayByKey;
  }, [
    activeChainNativeCurrency,
    currencyRates,
    currentCurrency,
    multichainAssetsRates,
    selectedChainTokens,
    tokenMarketData,
  ]);
  const selectedTokenKeys = useMemo(
    () => new Set(selectedTokens.map(getTokenKey)),
    [selectedTokens],
  );
  const selectedTokenCount = selectedTokens.length;
  const isPrimaryButtonDisabled =
    selectedTokenCount === 0 ||
    selectedTokenCount > MAX_BATCH_SELL_SOURCE_TOKENS;
  const primaryButtonLabel = useMemo(() => {
    if (selectedTokenCount > MAX_BATCH_SELL_SOURCE_TOKENS) {
      return strings('bridge.batch_sell_max_tokens_allowed');
    }

    if (selectedTokenCount === 1) {
      return strings('bridge.batch_sell_continue_with_one_token');
    }

    if (selectedTokenCount > 1) {
      return strings('bridge.batch_sell_continue_with_tokens', {
        tokenCount: selectedTokenCount,
      });
    }

    return strings('bridge.next');
  }, [selectedTokenCount]);

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleChainSelect = useCallback(
    (chainId?: CaipChainId) => {
      if (chainId !== selectedChainId) {
        setSelectedTokens([]);
      }

      setSelectedChainId(chainId);
    },
    [selectedChainId],
  );

  const handleTokenPress = useCallback(
    (token: BridgeToken) => {
      const tokenKey = getTokenKey(token);
      const tokenChainId = formatChainIdToCaip(token.chainId);

      if (selectedChainId && tokenChainId !== selectedChainId) {
        setSelectedChainId(tokenChainId);
        setSelectedTokens([token]);
        return;
      }

      if (!selectedChainId) {
        setSelectedChainId(tokenChainId);
      }

      setSelectedTokens((tokens) => {
        const isSelected = tokens.some(
          (selectedToken) => getTokenKey(selectedToken) === tokenKey,
        );

        if (isSelected) {
          return tokens.filter(
            (selectedToken) => getTokenKey(selectedToken) !== tokenKey,
          );
        }

        return [...tokens, token];
      });
    },
    [selectedChainId],
  );

  const handleNextPress = useCallback(() => {
    if (
      selectedTokens.length === 0 ||
      selectedTokens.length > MAX_BATCH_SELL_SOURCE_TOKENS
    ) {
      return;
    }

    const orderedSelectedTokens = sortBatchSellTokens(
      selectedTokens,
      tokenSortDirection,
    );

    trackBatchSellTokenPageContinueClicked(orderedSelectedTokens);

    if (orderedSelectedTokens.length === 1) {
      const sourceToken = orderedSelectedTokens[0];
      navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
        screen: Routes.BRIDGE.MODALS.HIGH_RATE_ALERT_MODAL,
        params: {
          sourceToken,
          destToken: getBatchSellDestinationToken(
            sourceToken.chainId,
            destinationStablecoins,
          ),
        },
      });
      return;
    }

    // Batch Sell picks a source chain in this screen without updating the wallet's
    // active network. Switch now so STX/gas checks and submit use the source chain
    // (same pattern as useInitialSourceToken on Swaps entry).
    if (orderedSelectedTokens[0]?.chainId) {
      const tokenChainId = orderedSelectedTokens[0].chainId;
      const tokenCaipChainId = formatChainIdToCaip(tokenChainId);
      const currentCaipChainId = formatChainIdToCaip(currentChainId);

      if (tokenCaipChainId !== currentCaipChainId) {
        if (isNonEvmChainId(tokenCaipChainId)) {
          onNonEvmNetworkChange(tokenCaipChainId);
        } else {
          const hexChainId = formatChainIdToHex(tokenCaipChainId);
          onSetRpcTarget(
            evmNetworkConfigurations[hexChainId] as NetworkConfiguration,
          );
        }
      }
    }

    dispatch(setBatchSellSourceTokens(orderedSelectedTokens));
    dispatch(
      setBatchSellSourceTokenAmounts(
        getDefaultBatchSellSourceTokenAmounts(orderedSelectedTokens),
      ),
    );
    dispatch(
      setBatchSellDestToken(
        getBatchSellDestinationToken(
          orderedSelectedTokens[0].chainId,
          destinationStablecoins,
        ),
      ),
    );
    dispatch(
      setBatchSellTokenSlippages(
        getDefaultBatchSellSlippages(orderedSelectedTokens),
      ),
    );
    navigation.navigate(Routes.BRIDGE.BATCH_SELL_REVIEW);
  }, [
    currentChainId,
    destinationStablecoins,
    dispatch,
    evmNetworkConfigurations,
    navigation,
    onNonEvmNetworkChange,
    onSetRpcTarget,
    selectedTokens,
    trackBatchSellTokenPageContinueClicked,
    tokenSortDirection,
  ]);

  const handleExploreTokensPress = useCallback(() => {
    navigation.navigate(Routes.TRENDING_VIEW, {
      screen: Routes.TRENDING_FEED,
    });
  }, [navigation]);

  const handleTokenSortToggle = useCallback(() => {
    setTokenSortDirection((currentSortDirection) =>
      currentSortDirection === 'desc' ? 'asc' : 'desc',
    );
  }, []);

  const renderNetworkPill = useCallback(
    (
      chainId: CaipChainId,
      label: string,
      isSelected: boolean,
      isDisabled = false,
    ) => (
      <ButtonToggle
        key={chainId}
        label={
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={2}
          >
            <AvatarNetwork
              src={getNetworkImageSource({ chainId })}
              size={AvatarNetworkSize.Xs}
              name={label}
              shape={AvatarBaseShape.Square}
              twClassName="rounded translate-y-px"
            />
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={
                isSelected ? TextColor.PrimaryInverse : TextColor.TextDefault
              }
            >
              {label}
            </Text>
          </Box>
        }
        isActive={isSelected}
        onPress={() => handleChainSelect(chainId)}
        isDisabled={isDisabled}
        size={ButtonToggleSize.Md}
        style={tw.style('rounded-xl py-2 px-3')}
        testID={`${BatchSellTokenSelectSelectorsIDs.NETWORK_PILL}-${chainId}`}
      />
    ),
    [handleChainSelect, tw],
  );

  const renderToken = useCallback(
    ({ item: token }: ListRenderItemInfo<BridgeToken>) => {
      const tokenKey = getTokenKey(token);
      const isSelected = selectedTokenKeys.has(tokenKey);

      const chainId = formatChainIdToCaip(token.chainId) as CaipChainId;
      const network = sortedEligibleChains.find(
        (eligibleNetwork) => eligibleNetwork.chainId === chainId,
      );
      const tokenPriceDisplay =
        tokenPriceDisplayByKey.get(tokenKey) ?? EMPTY_TOKEN_PRICE_DISPLAY;

      return (
        <Box
          testID={`${BatchSellTokenSelectSelectorsIDs.TOKEN_ROW}-${token.symbol}`}
        >
          <BatchSellTokenRow
            token={token}
            onTokenPress={handleTokenPress}
            networkName={network?.name}
            networkImageSource={getNetworkImageSource({ chainId })}
            isSelected={isSelected}
            tokenPriceText={tokenPriceDisplay.tokenPriceText}
            pricePercentChangeText={tokenPriceDisplay.pricePercentChangeText}
            pricePercentChangeTextColor={
              tokenPriceDisplay.pricePercentChangeTextColor
            }
          />
        </Box>
      );
    },
    [
      handleTokenPress,
      selectedTokenKeys,
      sortedEligibleChains,
      tokenPriceDisplayByKey,
    ],
  );

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      edges={['bottom', 'left', 'right']}
    >
      <Box twClassName="flex-1">
        <HeaderStandard title="" onBack={handleBackPress} includesTopInset />
        {sortedEligibleChains.length === 0 ? (
          <BatchSellEmptyState
            onExploreTokensPress={handleExploreTokensPress}
          />
        ) : (
          <>
            <Box twClassName="px-4 pt-2">
              <Text
                variant={TextVariant.HeadingLg}
                color={TextColor.TextDefault}
              >
                {strings('bridge.batch_sell_select_title')}
              </Text>
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
                twClassName="mt-1"
              >
                {strings('bridge.batch_sell_select_subtitle')}
              </Text>
            </Box>
            <Box twClassName="py-4 pl-4">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={tw.style(
                  'flex-row items-center gap-2 pr-4',
                )}
              >
                {sortedEligibleChains.map((network) =>
                  renderNetworkPill(
                    network.chainId,
                    network.name,
                    activeChainId === network.chainId,
                  ),
                )}
              </ScrollView>
            </Box>
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="px-4 py-2"
            >
              <Pressable
                accessibilityRole="button"
                onPress={handleTokenSortToggle}
                testID={BatchSellTokenSelectSelectorsIDs.BALANCE_SORT_BUTTON}
              >
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  gap={1}
                >
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                  >
                    {strings('bridge.sort_balance')}
                  </Text>
                  <Icon
                    name={
                      tokenSortDirection === 'desc'
                        ? IconName.Arrow2Down
                        : IconName.Arrow2Up
                    }
                    size={IconSize.Sm}
                    color={IconColor.IconAlternative}
                  />
                </Box>
              </Pressable>
            </Box>
            <FlatList
              testID={BatchSellTokenSelectSelectorsIDs.TOKEN_LIST}
              data={selectedChainTokens}
              renderItem={renderToken}
              keyExtractor={getTokenKey}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={tw.style('pb-4')}
            />
            <Box twClassName="border-t border-muted px-4 pb-4 pt-3">
              <Button
                variant={ButtonVariant.Primary}
                size={ButtonSize.Lg}
                isFullWidth
                isDisabled={isPrimaryButtonDisabled}
                onPress={handleNextPress}
                testID={BatchSellTokenSelectSelectorsIDs.NEXT_BUTTON}
              >
                {primaryButtonLabel}
              </Button>
            </Box>
          </>
        )}
      </Box>
    </SafeAreaView>
  );
}
