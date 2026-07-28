import { formatChainIdToCaip } from '@metamask/bridge-controller';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { CaipChainId } from '@metamask/utils';
import {
  AvatarToken,
  AvatarTokenSize,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation } from '@react-navigation/native';
import React, { memo, useCallback, useContext, useMemo, useState } from 'react';
import { Pressable } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import type { AppNavigationProp } from '../../../../../../../core/NavigationService/types';
import {
  selectAllowedChainRanking,
  selectDestToken,
  selectSourceToken,
  setDestToken,
  setSourceToken,
} from '../../../../../../../core/redux/slices/bridge';
import Routes from '../../../../../../../constants/navigation/Routes';
import { useTokensFeed } from '../../../../../../Views/TrendingView/feeds/tokens/useTokensFeed';
import { TokenDetailsSource } from '../../../../../TokenDetails/constants/constants';
import { getAssetNavigationParams } from '../../../../../Trending/components/TrendingTokenRowItem/TrendingTokenRowItem';
import { type BridgeToken, TokenSelectorType } from '../../../../types';
import { adaptTokenSecurityData } from '../../../../utils/tokenSecurityUtils';
import {
  getTradeNetworkChainId,
  resolveTradeSourceAmount,
  resolveTradeToken,
} from '../../tradeIntentUtils';
import { WalletAssistantWalletContext } from '../../walletContext';

export interface SwapIntent {
  amountType: 'exact' | 'fiat' | 'percent' | 'unspecified';
  amountValue: string;
  enabled: boolean;
  mode: 'real';
  network: string;
  sourceAmount: string;
  sourceSymbol: string;
  destinationSymbol: string;
}

export interface EmbeddedSwapCardProps {
  intent: SwapIntent;
  onReview: (
    sourceToken: BridgeToken | undefined,
    destinationToken: BridgeToken | undefined,
    sourceAmount: string | undefined,
    quoteRequestId: string | undefined,
  ) => void;
}

const getBridgeTokenFromTrendingAsset = (
  token: TrendingAsset | undefined,
): BridgeToken | undefined => {
  if (!token) return undefined;

  const asset = getAssetNavigationParams(token, TokenDetailsSource.Trending);
  if (!asset?.address || !asset.chainId) return undefined;

  return {
    address: asset.address,
    chainId: asset.chainId,
    decimals: token.decimals,
    image: asset.image,
    name: token.name,
    securityData: adaptTokenSecurityData(token.securityData),
    symbol: token.symbol,
  };
};

const getBridgeTokenKey = (token: BridgeToken | undefined) =>
  token ? `${token.chainId}:${token.address.toLowerCase()}` : '';

const areSameChain = (
  firstChainId: BridgeToken['chainId'] | string,
  secondChainId: BridgeToken['chainId'] | string,
) => {
  try {
    return (
      formatChainIdToCaip(firstChainId as BridgeToken['chainId']) ===
      formatChainIdToCaip(secondChainId as BridgeToken['chainId'])
    );
  } catch {
    return String(firstChainId) === String(secondChainId);
  }
};

const EmbeddedSwapCard = ({ intent, onReview }: EmbeddedSwapCardProps) => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  const selectedBridgeSourceToken = useSelector(selectSourceToken);
  const selectedBridgeDestinationToken = useSelector(selectDestToken);
  const [sourceSelectorBaselineKey, setSourceSelectorBaselineKey] =
    useState<string>();
  const [destinationSelectorBaselineKey, setDestinationSelectorBaselineKey] =
    useState<string>();
  const [sourceSelectorSeedToken, setSourceSelectorSeedToken] =
    useState<BridgeToken>();
  const [destinationSelectorSeedToken, setDestinationSelectorSeedToken] =
    useState<BridgeToken>();
  const allowedChainRanking = useSelector(selectAllowedChainRanking);
  const { activeChainId, tokensWithBalance } = useContext(
    WalletAssistantWalletContext,
  );
  const requestedChainId = getTradeNetworkChainId(intent.network);
  const { data: sourceResults, isLoading: isSourceLoading } = useTokensFeed({
    chainIds: requestedChainId ? [requestedChainId as CaipChainId] : undefined,
    query: intent.sourceSymbol,
    hideRiskyTokens: true,
  });
  const { data: destinationResults, isLoading: isDestinationLoading } =
    useTokensFeed({
      chainIds: requestedChainId
        ? [requestedChainId as CaipChainId]
        : undefined,
      query: intent.destinationSymbol,
      hideRiskyTokens: true,
    });
  const sourceResolution = useMemo(
    () =>
      resolveTradeToken(
        sourceResults,
        intent.sourceSymbol,
        intent.network,
        activeChainId,
      ),
    [activeChainId, intent.network, intent.sourceSymbol, sourceResults],
  );
  const destinationResolution = useMemo(
    () =>
      resolveTradeToken(
        destinationResults,
        intent.destinationSymbol,
        intent.network,
        '',
      ),
    [destinationResults, intent.destinationSymbol, intent.network],
  );
  const resolvedTrendingSourceToken = useMemo(
    () => getBridgeTokenFromTrendingAsset(sourceResolution.asset),
    [sourceResolution.asset],
  );
  const initialDestinationToken = useMemo(
    () => getBridgeTokenFromTrendingAsset(destinationResolution.asset),
    [destinationResolution.asset],
  );
  const walletSourceToken = useMemo(() => {
    const positiveBalanceTokens = tokensWithBalance.filter(
      (token) => Number(token.balance ?? 0) > 0,
    );
    const requestedSourceSymbol = intent.sourceSymbol.trim().toUpperCase();

    if (requestedSourceSymbol) {
      const candidates = positiveBalanceTokens.filter(
        (token) =>
          token.symbol.toUpperCase() === requestedSourceSymbol &&
          (!activeChainId || areSameChain(token.chainId, activeChainId)) &&
          (!resolvedTrendingSourceToken ||
            areSameChain(token.chainId, resolvedTrendingSourceToken.chainId)),
      );
      return candidates.length === 1 ? candidates[0] : undefined;
    }

    const nonDestinationTokens = positiveBalanceTokens.filter(
      (token) =>
        !initialDestinationToken ||
        !areSameChain(token.chainId, initialDestinationToken.chainId) ||
        token.address.toLowerCase() !==
          initialDestinationToken.address.toLowerCase(),
    );

    return (
      nonDestinationTokens.find(
        (token) =>
          initialDestinationToken &&
          areSameChain(token.chainId, initialDestinationToken.chainId),
      ) ?? nonDestinationTokens[0]
    );
  }, [
    activeChainId,
    initialDestinationToken,
    intent.sourceSymbol,
    resolvedTrendingSourceToken,
    tokensWithBalance,
  ]);
  const initialSourceToken = walletSourceToken ?? resolvedTrendingSourceToken;
  const hasSelectedSourceInSwap =
    sourceSelectorBaselineKey !== undefined &&
    getBridgeTokenKey(selectedBridgeSourceToken) !== sourceSelectorBaselineKey;
  const hasSelectedDestinationInSwap =
    destinationSelectorBaselineKey !== undefined &&
    getBridgeTokenKey(selectedBridgeDestinationToken) !==
      destinationSelectorBaselineKey;
  const sourceToken = hasSelectedSourceInSwap
    ? selectedBridgeSourceToken
    : (sourceSelectorSeedToken ?? initialSourceToken);
  const destinationToken = hasSelectedDestinationInSwap
    ? selectedBridgeDestinationToken
    : (destinationSelectorSeedToken ?? initialDestinationToken);
  const isResolving = isSourceLoading || isDestinationLoading;
  const needsTokenSelection = !sourceToken || !destinationToken;
  const unresolvedTokenLabel = !sourceToken
    ? intent.sourceSymbol || 'payment token'
    : intent.destinationSymbol || 'token to receive';
  const requestedAmount =
    intent.amountType === 'fiat'
      ? `$${intent.amountValue}`
      : intent.amountType === 'percent'
        ? `${intent.amountValue}%`
        : intent.amountValue || intent.sourceAmount || 'Choose amount';
  const sourceAmountLabel =
    intent.amountType === 'fiat' || intent.amountType === 'unspecified'
      ? requestedAmount
      : `${requestedAmount} ${sourceToken?.symbol ?? intent.sourceSymbol}`;
  const isWalletFundingDefault =
    !intent.sourceSymbol && sourceToken === walletSourceToken;
  const sourceAmountForQuote = useMemo(
    () => resolveTradeSourceAmount(intent, sourceToken).amount,
    [intent, sourceToken],
  );
  const networkNames = useMemo(
    () =>
      new Map(
        allowedChainRanking.map(
          (chain) => [chain.chainId, chain.name] as const,
        ),
      ),
    [allowedChainRanking],
  );
  const getNetworkName = useCallback(
    (token: BridgeToken | undefined) => {
      if (!token) return 'Choose token and network';

      try {
        const caipChainId = formatChainIdToCaip(token.chainId);
        return networkNames.get(caipChainId) ?? String(caipChainId);
      } catch {
        return String(token.chainId);
      }
    },
    [networkNames],
  );
  const handleSelectSource = useCallback(() => {
    dispatch(setSourceToken(sourceToken));
    setSourceSelectorSeedToken(sourceToken);
    setSourceSelectorBaselineKey(getBridgeTokenKey(sourceToken));
    navigation.navigate(Routes.BRIDGE.TOKEN_SELECTOR, {
      type: TokenSelectorType.Source,
    });
  }, [dispatch, navigation, sourceToken]);
  const handleSelectDestination = useCallback(() => {
    if (destinationToken) {
      dispatch(setDestToken(destinationToken));
    }
    setDestinationSelectorSeedToken(destinationToken);
    setDestinationSelectorBaselineKey(
      getBridgeTokenKey(destinationToken ?? selectedBridgeDestinationToken),
    );
    navigation.navigate(Routes.BRIDGE.TOKEN_SELECTOR, {
      type: TokenSelectorType.Dest,
    });
  }, [destinationToken, dispatch, navigation, selectedBridgeDestinationToken]);
  const handlePrimaryAction = useCallback(() => {
    if (!sourceToken) {
      handleSelectSource();
      return;
    }
    if (!destinationToken) {
      handleSelectDestination();
      return;
    }
    onReview(sourceToken, destinationToken, sourceAmountForQuote, undefined);
  }, [
    destinationToken,
    handleSelectDestination,
    handleSelectSource,
    onReview,
    sourceAmountForQuote,
    sourceToken,
  ]);

  return (
    <Box twClassName="mt-4 gap-4 rounded-2xl border border-muted bg-muted p-4">
      <Box twClassName="gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`You pay ${sourceAmountLabel}${
            sourceToken?.symbol &&
            !sourceAmountLabel.includes(sourceToken.symbol)
              ? ` with ${sourceToken.symbol}`
              : ''
          } on ${getNetworkName(sourceToken)}`}
          accessibilityHint="Opens the MetaMask Swap token and network selector"
          onPress={handleSelectSource}
          testID="wallet-assistant-source-token-selector"
          style={({ pressed }) =>
            tw.style(
              'min-h-16 flex-row items-center gap-3 rounded-xl border border-muted bg-default px-3 py-2',
              pressed && 'opacity-70',
            )
          }
        >
          <AvatarToken
            name={sourceToken?.symbol || intent.sourceSymbol || 'Token'}
            src={sourceToken?.image ? { uri: sourceToken.image } : undefined}
            size={AvatarTokenSize.Md}
          />
          <Box twClassName="min-w-0 flex-1">
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              You pay
            </Text>
            <Text variant={TextVariant.BodyLg} fontWeight={FontWeight.Medium}>
              {sourceAmountLabel}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              numberOfLines={1}
            >
              {getNetworkName(sourceToken)}
              {isWalletFundingDefault ? ' · From wallet' : ''}
              {sourceAmountForQuote && intent.amountType !== 'exact'
                ? ` · ≈ ${sourceAmountForQuote} ${
                    sourceToken?.symbol ?? intent.sourceSymbol
                  }`
                : ''}
            </Text>
          </Box>
          <Icon
            name={IconName.ArrowDown}
            size={IconSize.Sm}
            color={IconColor.IconAlternative}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`You receive ${
            destinationToken?.symbol || intent.destinationSymbol || 'token'
          } on ${getNetworkName(destinationToken)}`}
          accessibilityHint="Opens the MetaMask Swap token and network selector"
          onPress={handleSelectDestination}
          testID="wallet-assistant-destination-token-selector"
          style={({ pressed }) =>
            tw.style(
              'min-h-16 flex-row items-center gap-3 rounded-xl border border-muted bg-default px-3 py-2',
              pressed && 'opacity-70',
            )
          }
        >
          <AvatarToken
            name={
              destinationToken?.symbol || intent.destinationSymbol || 'Token'
            }
            src={
              destinationToken?.image
                ? { uri: destinationToken.image }
                : undefined
            }
            size={AvatarTokenSize.Md}
          />
          <Box twClassName="min-w-0 flex-1">
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              You receive
            </Text>
            <Text variant={TextVariant.BodyLg} fontWeight={FontWeight.Medium}>
              {destinationToken?.symbol ||
                intent.destinationSymbol ||
                'Select token'}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              numberOfLines={1}
            >
              {getNetworkName(destinationToken)}
            </Text>
          </Box>
          <Icon
            name={IconName.ArrowDown}
            size={IconSize.Sm}
            color={IconColor.IconAlternative}
          />
        </Pressable>
      </Box>
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {needsTokenSelection
          ? `Choose the ${unresolvedTokenLabel} and network above.`
          : `MetaMask will fetch a live quote${
              intent.network ? ` on ${intent.network}` : ''
            } and show fees before you confirm.`}
      </Text>
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        isFullWidth
        isDisabled={isResolving && !needsTokenSelection}
        onPress={handlePrimaryAction}
      >
        {!sourceToken
          ? 'Choose payment token'
          : !destinationToken
            ? 'Choose token to receive'
            : isResolving
              ? 'Resolving tokens…'
              : 'Review swap'}
      </Button>
    </Box>
  );
};

export default memo(EmbeddedSwapCard);
