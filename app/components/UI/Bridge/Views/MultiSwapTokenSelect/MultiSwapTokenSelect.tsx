import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, ListRenderItemInfo } from 'react-native';
import { FlatList, ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  AvatarBaseShape,
  AvatarNetwork,
  AvatarNetworkSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  Checkbox,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { CaipChainId } from '@metamask/utils';

import { getHeaderCompactStandardNavbarOptions } from '../../../../../component-library/components-temp/HeaderCompactStandard';
import { strings } from '../../../../../../locales/i18n';
import AppConstants from '../../../../../core/AppConstants';
import Routes from '../../../../../constants/navigation/Routes';
import {
  selectBatchSellDestStablecoinsByChain,
  setBatchSellSourceTokens,
} from '../../../../../core/redux/slices/bridge';
import { BridgeToken } from '../../types';
import { useTokensWithBalance } from '../../hooks/useTokensWithBalance';
import ButtonToggle from '../../../../../component-library/components-temp/Buttons/ButtonToggle';
import { ButtonSize as ButtonToggleSize } from '../../../../../component-library/components/Buttons/Button';
import { getNetworkImageSource } from '../../../../../util/networks';
import { TokenSelectorItem } from '../../components/TokenSelectorItem';
import emptyStateDefiLight from '../../../../../images/empty-state-defi-light.png';
import {
  buildBatchSellEligibleChains,
  removeStablecoinsFromSourceTokens,
  getBatchSellDestinationToken,
  MAX_BATCH_SELL_SOURCE_TOKENS,
  sortBatchSellTokens,
  SUPPORTED_BATCH_SELL_CHAIN_IDS,
} from './MultiSwapTokenSelect.utils';
import { MultiSwapTokenSelectSelectorsIDs } from './MultiSwapTokenSelect.testIds';

const getTokenKey = (token: BridgeToken) =>
  `${formatChainIdToCaip(token.chainId)}:${token.address}`;

export function MultiSwapTokenSelect() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const tw = useTailwind();
  const stablecoinsByChain = useSelector(selectBatchSellDestStablecoinsByChain);
  const allWalletTokens = useTokensWithBalance({
    chainIds: SUPPORTED_BATCH_SELL_CHAIN_IDS,
  });
  const eligibleSourceTokens = useMemo(() => {
    const sourceTokens = removeStablecoinsFromSourceTokens({
      tokens: allWalletTokens,
      stablecoinsByChain,
    });

    return sortBatchSellTokens(sourceTokens);
  }, [stablecoinsByChain, allWalletTokens]);
  const sortedEligibleChains = useMemo(
    () => buildBatchSellEligibleChains(eligibleSourceTokens),
    [eligibleSourceTokens],
  );
  const [selectedChainId, setSelectedChainId] = useState<
    CaipChainId | undefined
  >(() => sortedEligibleChains[0]?.chainId);
  const [selectedTokens, setSelectedTokens] = useState<BridgeToken[]>([]);

  useEffect(() => {
    navigation.setOptions(
      getHeaderCompactStandardNavbarOptions({
        title: '',
        onBack: () => navigation.goBack(),
        includesTopInset: true,
      }),
    );
  }, [navigation]);

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
  const selectedChainTokens = useMemo(
    () =>
      activeChainId
        ? eligibleSourceTokens.filter(
            (token) => formatChainIdToCaip(token.chainId) === activeChainId,
          )
        : eligibleSourceTokens,
    [activeChainId, eligibleSourceTokens],
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

    if (selectedTokens.length === 1) {
      const sourceToken = selectedTokens[0];
      navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
        screen: Routes.BRIDGE.MODALS.HIGH_RATE_ALERT_MODAL,
        params: {
          sourceToken,
          destToken: getBatchSellDestinationToken(
            sourceToken,
            stablecoinsByChain,
          ),
        },
      });
      return;
    }

    dispatch(setBatchSellSourceTokens(selectedTokens));
    navigation.navigate(Routes.BRIDGE.QUOTE_SELECTOR_VIEW);
  }, [dispatch, navigation, selectedTokens, stablecoinsByChain]);

  const handleExploreTokensPress = useCallback(() => {
    navigation.navigate(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params: {
        newTabUrl: AppConstants.EXPLORE_TOKENS.URL,
        timestamp: Date.now(),
      },
    });
  }, [navigation]);

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
        testID={`${MultiSwapTokenSelectSelectorsIDs.NETWORK_PILL}-${chainId}`}
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
          testID={`${MultiSwapTokenSelectSelectorsIDs.TOKEN_ROW}-${token.symbol}`}
        >
          <TokenSelectorItem
            token={token}
            onPress={handleTokenPress}
            networkName={network?.name}
            networkImageSource={getNetworkImageSource({ chainId })}
            isSelected={isSelected}
          >
            <Checkbox
              isSelected={isSelected}
              onChange={() => handleTokenPress(token)}
              accessibilityLabel={`${token.symbol} ${strings(
                'bridge.batch_sell_checkbox_label',
              )}`}
            />
          </TokenSelectorItem>
        </Box>
      );
    },
    [handleTokenPress, selectedTokenKeys, sortedEligibleChains],
  );

  if (eligibleSourceTokens.length === 0) {
    return (
      <SafeAreaView style={tw.style('flex-1 bg-default')} edges={['bottom']}>
        <Box
          testID={MultiSwapTokenSelectSelectorsIDs.EMPTY_STATE}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="flex-1 px-8"
        >
          <Image
            source={emptyStateDefiLight}
            resizeMode="contain"
            style={tw.style('h-[96px] w-[96px] mb-6')}
          />
          <Text
            variant={TextVariant.HeadingMd}
            color={TextColor.TextDefault}
            twClassName="text-center"
          >
            {strings('bridge.batch_sell_empty_state_title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="mt-2 text-center"
          >
            {strings('bridge.batch_sell_empty_state_description')}
          </Text>
          <Box twClassName="mt-6 w-full">
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={handleExploreTokensPress}
              testID={MultiSwapTokenSelectSelectorsIDs.EXPLORE_TOKENS_BUTTON}
            >
              {strings('bridge.explore_tokens')}
            </Button>
          </Box>
        </Box>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw.style('flex-1 bg-default')} edges={['bottom']}>
      <Box twClassName="flex-1">
        <Box twClassName="px-4 pt-2">
          <Text variant={TextVariant.HeadingLg} color={TextColor.TextDefault}>
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
        <Box twClassName="pt-4 pl-4">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tw.style('flex-row items-center gap-2 pr-4')}
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
          twClassName="px-4 py-4"
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
              name={IconName.Arrow2Down}
              size={IconSize.Sm}
              color={IconColor.IconAlternative}
            />
          </Box>
        </Box>
        <FlatList
          testID={MultiSwapTokenSelectSelectorsIDs.TOKEN_LIST}
          data={selectedChainTokens}
          renderItem={renderToken}
          keyExtractor={getTokenKey}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw.style('pb-4')}
          ListEmptyComponent={
            <Box
              testID={MultiSwapTokenSelectSelectorsIDs.SEARCH_EMPTY_STATE}
              alignItems={BoxAlignItems.Center}
              twClassName="px-8 py-20"
            >
              <Text
                variant={TextVariant.HeadingMd}
                color={TextColor.TextDefault}
                twClassName="text-center"
              >
                {strings('bridge.no_tokens_found')}
              </Text>
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
                twClassName="mt-2 text-center"
              >
                {strings('bridge.no_tokens_found_description')}
              </Text>
            </Box>
          }
        />
        <Box twClassName="border-t border-muted px-4 pb-4 pt-3">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            isDisabled={isPrimaryButtonDisabled}
            onPress={handleNextPress}
            testID={MultiSwapTokenSelectSelectorsIDs.NEXT_BUTTON}
          >
            {primaryButtonLabel}
          </Button>
        </Box>
      </Box>
    </SafeAreaView>
  );
}
