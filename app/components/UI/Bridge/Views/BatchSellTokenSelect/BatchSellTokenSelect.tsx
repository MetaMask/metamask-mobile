import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
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
  isNonEvmChainId,
  BatchSellMetricsLocation,
} from '@metamask/bridge-controller';
import { CaipAssetType, CaipChainId } from '@metamask/utils';
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
import { selectEvmNetworkConfigurationsByChainId } from '../../../../../selectors/networkController';
import {
  selectIsEvmNetworkSelected,
  selectSelectedNonEvmNetworkChainId,
} from '../../../../../selectors/multichainNetworkController';
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

export function BatchSellTokenSelect() {
  const navigation = useNavigation();
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
    dispatch(resetBridgeState());
  }, [dispatch]);

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

      if (selectedTokenKeys.has(tokenKey)) {
        setSelectedTokens((tokens) =>
          tokens.filter(
            (selectedToken) => getTokenKey(selectedToken) !== tokenKey,
          ),
        );
        return;
      }

      const tokenChainId = formatChainIdToCaip(token.chainId);

      if (selectedChainId && tokenChainId !== selectedChainId) {
        setSelectedChainId(tokenChainId);
        setSelectedTokens([token]);
        return;
      }

      if (!selectedChainId) {
        setSelectedChainId(tokenChainId);
      }

      setSelectedTokens((tokens) => [...tokens, token]);
    },
    [selectedChainId, selectedTokenKeys],
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
          />
        </Box>
      );
    },
    [handleTokenPress, selectedTokenKeys, sortedEligibleChains],
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
