import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { formatAddressToAssetId } from '@metamask/bridge-controller';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  AvatarToken,
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  HeaderStandard,
  IconColor,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import {
  selectBatchSellSlippages,
  selectBatchSellDestToken,
  selectBatchSellDestStablecoins,
  selectBatchSellSourceTokenAmounts,
  selectBatchSellSourceTokens,
  setBatchSellDestToken,
  setBatchSellSourceTokenAmount,
  setBatchSellSourceTokenAmounts,
  setBatchSellSourceTokens,
  setBatchSellTokenSlippages,
} from '../../../../../core/redux/slices/bridge';
import { RootState } from '../../../../../reducers';
import Engine from '../../../../../core/Engine';
import { BridgeToken } from '../../types';
import { getBatchSellSlippage } from '../../components/SlippageModal/utils';
import { BatchSellReviewSelectorsIDs } from './BatchSellReview.testIds';
import { BatchSellReviewTokenRow } from './BatchSellReviewTokenRow';
import {
  getBatchSellSourceTokenAmount,
  hasValidBatchSellSourceAmounts,
  useBatchSellQuoteRequest,
} from '../../hooks/useBatchSellQuoteRequest';
import { useBatchSellQuoteData } from '../../hooks/useBatchSellQuoteData';
import { useTrackBatchSellQuotePageViewed } from '../../hooks/useTrackBatchSellQuotePageViewed';
import { useTrackBatchSellQuotePageReviewClicked } from '../../hooks/useTrackBatchSellQuotePageReviewClicked';

const DEFAULT_PERCENT = 100;
const UNKNOWN_DESTINATION_TOKEN_SYMBOL = 'UNKNOWN';
const TOTAL_RECEIVED_SKELETON_WIDTH = 195;
const TOTAL_RECEIVED_SKELETON_HEIGHT = 50;

const getTokenKey = (token: BridgeToken) => `${token.chainId}:${token.address}`;

function TotalReceivedValue({
  totalReceived,
  isLoading,
}: {
  totalReceived: { formattedFiat: string };
  isLoading: boolean;
}) {
  const tw = useTailwind();

  if (isLoading) {
    return (
      <Skeleton
        width={TOTAL_RECEIVED_SKELETON_WIDTH}
        height={TOTAL_RECEIVED_SKELETON_HEIGHT}
        style={tw.style('rounded-lg')}
        testID={BatchSellReviewSelectorsIDs.TOTAL_RECEIVED_SKELETON}
      />
    );
  }

  return (
    <Text
      variant={TextVariant.DisplayLg}
      color={TextColor.SuccessDefault}
      twClassName="min-w-0 flex-1 font-semibold"
    >
      {totalReceived.formattedFiat}
    </Text>
  );
}

function areBatchSellValueMapsEqual(
  first: Record<string, string | undefined>,
  second: Record<string, string | undefined>,
) {
  const firstKeys = Object.keys(first);
  const secondKeys = Object.keys(second);

  if (firstKeys.length !== secondKeys.length) return false;

  return firstKeys.every((assetId) => {
    if (!Object.prototype.hasOwnProperty.call(second, assetId)) return false;

    return Object.is(first[assetId], second[assetId]);
  });
}

export function BatchSellReview() {
  const navigation = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  const tw = useTailwind();
  const selectedTokens = useSelector(selectBatchSellSourceTokens);
  const sourceChainId = selectedTokens[0]?.chainId;
  const destinationTokens = useSelector((state: RootState) =>
    selectBatchSellDestStablecoins(state, sourceChainId),
  );
  const selectedDestinationToken = useSelector(selectBatchSellDestToken);
  const batchSellSlippages = useSelector(selectBatchSellSlippages);
  const batchSellSourceTokenAmounts = useSelector(
    selectBatchSellSourceTokenAmounts,
  );
  const isRemoveTokenDisabled = selectedTokens.length <= 2;
  const [percentsByTokenKey, setPercentsByTokenKey] = useState<
    Record<string, number>
  >({});
  const { updateBatchSellQuoteParams, getNewQuote: handleGetNewQuote } =
    useBatchSellQuoteRequest();
  const batchSellQuoteData = useBatchSellQuoteData();
  const hasValidSourceAmounts = useMemo(
    () =>
      hasValidBatchSellSourceAmounts(
        selectedTokens,
        batchSellSourceTokenAmounts,
        selectedDestinationToken,
      ),
    [batchSellSourceTokenAmounts, selectedDestinationToken, selectedTokens],
  );

  // Seed the selected destination token on entry so the pill always reads from Redux.
  useEffect(() => {
    if (destinationTokens[0] && !selectedDestinationToken) {
      dispatch(setBatchSellDestToken(destinationTokens[0]));
    }
  }, [destinationTokens, dispatch, selectedDestinationToken]);

  // Keep local percents aligned with selected tokens while defaulting new tokens to 100%.
  useEffect(() => {
    setPercentsByTokenKey((currentPercents) =>
      selectedTokens.reduce<Record<string, number>>((nextPercents, token) => {
        const tokenKey = getTokenKey(token);
        nextPercents[tokenKey] = currentPercents[tokenKey] ?? DEFAULT_PERCENT;
        return nextPercents;
      }, {}),
    );
  }, [selectedTokens]);

  useEffect(() => {
    if (hasValidSourceAmounts) {
      updateBatchSellQuoteParams();
    } else {
      updateBatchSellQuoteParams.cancel();
      Engine.context.BridgeController?.resetState?.();
    }

    return () => {
      updateBatchSellQuoteParams.cancel();
    };
  }, [hasValidSourceAmounts, updateBatchSellQuoteParams]);

  useTrackBatchSellQuotePageViewed({
    batchSellSlippages,
    selectedTokens,
    tokenData: batchSellQuoteData.tokenData,
  });
  const trackBatchSellQuotePageReviewClicked =
    useTrackBatchSellQuotePageReviewClicked({
      batchSellSlippages,
      selectedTokens,
      tokenData: batchSellQuoteData.tokenData,
    });

  useEffect(
    () => () => {
      // Clear controller quote state so returning to review does not show stale quotes.
      Engine.context.BridgeController?.resetState?.();
    },
    [],
  );

  useEffect(() => {
    const nextSourceTokenAmounts = selectedTokens.reduce<
      Record<string, string | undefined>
    >((sourceAmountsByAssetId, token) => {
      const assetId = formatAddressToAssetId(token.address, token.chainId);

      if (!assetId) return sourceAmountsByAssetId;

      sourceAmountsByAssetId[assetId] =
        batchSellSourceTokenAmounts[assetId] ??
        getBatchSellSourceTokenAmount(
          token,
          percentsByTokenKey[getTokenKey(token)] ?? DEFAULT_PERCENT,
        );
      return sourceAmountsByAssetId;
    }, {});

    if (
      !areBatchSellValueMapsEqual(
        batchSellSourceTokenAmounts,
        nextSourceTokenAmounts,
      )
    ) {
      dispatch(setBatchSellSourceTokenAmounts(nextSourceTokenAmounts));
    }
  }, [
    batchSellSourceTokenAmounts,
    dispatch,
    percentsByTokenKey,
    selectedTokens,
  ]);

  useEffect(() => {
    // Keep Redux slippages aligned with selected tokens when the user removes tokens.
    const nextSlippage = selectedTokens.reduce<
      Record<string, string | undefined>
    >((slippageByAssetId, token) => {
      const assetId = formatAddressToAssetId(token.address, token.chainId);

      if (!assetId) return slippageByAssetId;

      slippageByAssetId[assetId] = getBatchSellSlippage(
        batchSellSlippages,
        assetId,
      );
      return slippageByAssetId;
    }, {});

    if (!areBatchSellValueMapsEqual(batchSellSlippages, nextSlippage)) {
      dispatch(setBatchSellTokenSlippages(nextSlippage));
    }
  }, [batchSellSlippages, dispatch, selectedTokens]);

  const handlePercentChange = useCallback(
    (tokenKey: string, percent: number) => {
      setPercentsByTokenKey((currentPercents) => ({
        ...currentPercents,
        [tokenKey]: percent,
      }));

      const token = selectedTokens.find(
        (selectedToken) => getTokenKey(selectedToken) === tokenKey,
      );
      const assetId = token
        ? formatAddressToAssetId(token.address, token.chainId)
        : undefined;

      if (!token || !assetId) return;

      dispatch(
        setBatchSellSourceTokenAmount({
          assetId,
          amount: getBatchSellSourceTokenAmount(token, percent),
        }),
      );
    },
    [dispatch, selectedTokens],
  );

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleOpenDestinationTokenSelector = useCallback(() => {
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.BATCH_SELL_DESTINATION_TOKEN_SELECTOR_MODAL,
    });
  }, [navigation]);

  const handleOpenQuoteDetails = useCallback(() => {
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.BATCH_SELL_QUOTE_DETAILS_MODAL,
    });
  }, [navigation]);

  const handleOpenHighPriceImpactInfo = useCallback(
    (priceImpact: string) => {
      navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
        screen: Routes.BRIDGE.MODALS.BATCH_SELL_PRICE_IMPACT_INFO_MODAL,
        params: { priceImpact },
      });
    },
    [navigation],
  );

  const handleOpenFinalReview = useCallback(() => {
    trackBatchSellQuotePageReviewClicked();

    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.BATCH_SELL_FINAL_REVIEW_MODAL,
    });
  }, [navigation, trackBatchSellQuotePageReviewClicked]);

  const handleSlippagePress = useCallback(
    (token: BridgeToken) => {
      const assetId = formatAddressToAssetId(token.address, token.chainId);

      if (!assetId) return;

      navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
        screen: Routes.BRIDGE.MODALS.BATCH_SELL_DEFAULT_SLIPPAGE_MODAL,
        params: {
          sourceChainId: token.chainId,
          destChainId: selectedDestinationToken?.chainId,
          batchSellAssetId: assetId,
        },
      });
    },
    [navigation, selectedDestinationToken?.chainId],
  );

  const handleRemoveToken = useCallback(
    (tokenToRemove: BridgeToken) => {
      if (isRemoveTokenDisabled) return;

      const tokenKeyToRemove = getTokenKey(tokenToRemove);
      const remainingTokens = selectedTokens.filter(
        (token) => getTokenKey(token) !== tokenKeyToRemove,
      );

      dispatch(setBatchSellSourceTokens(remainingTokens));
    },
    [dispatch, isRemoveTokenDisabled, selectedTokens],
  );

  const shouldGetNewQuote = batchSellQuoteData.needsNewQuote;
  const isFetchingQuotes = batchSellQuoteData.isLoading && !shouldGetNewQuote;
  const hasReviewableQuote =
    batchSellQuoteData.hasAnyQuote && !batchSellQuoteData.hasPendingQuoteRows;
  const isReviewButtonDisabled =
    !hasValidSourceAmounts ||
    (!shouldGetNewQuote && (isFetchingQuotes || !hasReviewableQuote));
  let reviewButtonLabel = strings('bridge.batch_sell_review');

  if (shouldGetNewQuote) {
    reviewButtonLabel = strings('quote_expired_modal.get_new_quote');
  } else if (isFetchingQuotes) {
    reviewButtonLabel = strings('bridge.batch_sell_searching_best_quotes');
  }

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      edges={['bottom', 'left', 'right']}
    >
      <Box
        testID={BatchSellReviewSelectorsIDs.CONTAINER}
        twClassName="flex-1 bg-default"
      >
        <HeaderStandard title="" onBack={handleBackPress} includesTopInset />
        <Box twClassName="gap-1 px-4 pb-6">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={1}
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
            >
              {strings('bridge.batch_sell_total_received')}
            </Text>
            <ButtonIcon
              iconName={IconName.Info}
              iconProps={{ color: IconColor.IconDefault }}
              size={ButtonIconSize.Sm}
              onPress={handleOpenQuoteDetails}
              testID={BatchSellReviewSelectorsIDs.TOTAL_RECEIVED_INFO_BUTTON}
            />
          </Box>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
            gap={1}
          >
            <TotalReceivedValue
              totalReceived={batchSellQuoteData.totalReceived}
              isLoading={batchSellQuoteData.isSummaryLoading}
            />
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Md}
              testID={BatchSellReviewSelectorsIDs.DESTINATION_TOKEN_PILL}
              onPress={handleOpenDestinationTokenSelector}
            >
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                gap={2}
              >
                <AvatarToken
                  name={
                    selectedDestinationToken?.symbol ??
                    UNKNOWN_DESTINATION_TOKEN_SYMBOL
                  }
                  src={
                    selectedDestinationToken?.image
                      ? { uri: selectedDestinationToken.image }
                      : undefined
                  }
                  size={AvatarTokenSize.Sm}
                />
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextDefault}
                >
                  {selectedDestinationToken?.symbol ??
                    UNKNOWN_DESTINATION_TOKEN_SYMBOL}
                </Text>
              </Box>
            </Button>
          </Box>
        </Box>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw.style('pb-4')}
        >
          {selectedTokens.map((token) => {
            const tokenKey = getTokenKey(token);
            const assetId = formatAddressToAssetId(
              token.address,
              token.chainId,
            );
            const tokenQuoteData = assetId
              ? batchSellQuoteData.tokenData[assetId]
              : undefined;
            const priceImpact = tokenQuoteData?.priceImpact;

            return (
              <BatchSellReviewTokenRow
                key={tokenKey}
                token={token}
                tokenKey={tokenKey}
                percent={percentsByTokenKey[tokenKey] ?? DEFAULT_PERCENT}
                receivedAmount={tokenQuoteData?.receivedAmountFiat ?? ''}
                isLoading={
                  tokenQuoteData?.isLoading ?? batchSellQuoteData.isLoading
                }
                isQuoteUnavailable={tokenQuoteData?.isQuoteUnavailable}
                isHighPriceImpact={tokenQuoteData?.isHighPriceImpact}
                onHighPriceImpactPress={
                  priceImpact
                    ? () => handleOpenHighPriceImpactInfo(priceImpact)
                    : undefined
                }
                onPercentChange={handlePercentChange}
                onSlippagePress={handleSlippagePress}
                onRemovePress={handleRemoveToken}
                isRemoveTokenDisabled={isRemoveTokenDisabled}
              />
            );
          })}
        </ScrollView>
        <Box twClassName="border-t border-muted px-4 pb-4 pt-3">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            isDisabled={isReviewButtonDisabled}
            onPress={
              shouldGetNewQuote ? handleGetNewQuote : handleOpenFinalReview
            }
            testID={BatchSellReviewSelectorsIDs.REVIEW_BUTTON}
          >
            {reviewButtonLabel}
          </Button>
        </Box>
      </Box>
    </SafeAreaView>
  );
}
