import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
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
  resetBridgeState,
  selectBatchSellSlippages,
  selectBatchSellDestToken,
  selectBatchSellDestStablecoins,
  selectBatchSellSourceTokens,
  setBatchSellDestToken,
  setBatchSellSourceTokens,
  setBatchSellTokenSlippages,
} from '../../../../../core/redux/slices/bridge';
import { RootState } from '../../../../../reducers';
import { BridgeToken } from '../../types';
import { getBridgeTokenAssetId } from '../../utils/tokenUtils';
import {
  DEFAULT_BATCH_SELL_SLIPPAGE,
  getBatchSellSlippage,
  getSlippageDisplayValue,
} from '../../components/SlippageModal/utils';
import { BatchSellFinalReviewSourceTokenData } from '../../components/BatchSellFinalReviewModal/BatchSellFinalReviewModal.types';
import { BatchSellReviewSelectorsIDs } from './BatchSellReview.testIds';
import { BatchSellReviewTokenRow } from './BatchSellReviewTokenRow';

const DEFAULT_PERCENT = 100;
const UNKNOWN_DESTINATION_TOKEN_SYMBOL = 'UNKNOWN';
// TODO(SWAPS-4439): When Batch Sell quote fetching is wired, pass
// batchSellSlippages[assetId] into each token's BridgeController quote request.
const HAS_QUOTES = true;
const QUOTE_DETAILS_PLACEHOLDER_AMOUNT = '--';
const NETWORK_FEE_PLACEHOLDER = '1.20 USDC';
const NETWORK_FEE_FIAT_PLACEHOLDER = '$1.20';
const METAMASK_FEE_PERCENT = '0.875';

const getTokenKey = (token: BridgeToken) => `${token.chainId}:${token.address}`;

function getSourceTokenData(
  token: BridgeToken,
): BatchSellFinalReviewSourceTokenData {
  const sourceTokenData: BatchSellFinalReviewSourceTokenData = {
    key: getTokenKey(token),
    tokenSymbol: token.symbol,
  };

  if (token.image) sourceTokenData.image = token.image;

  return sourceTokenData;
}

function areBatchSellSlippageMapsEqual(
  first: Record<string, string | undefined>,
  second: Record<string, string | undefined>,
) {
  const firstKeys = Object.keys(first);
  const secondKeys = Object.keys(second);

  return (
    firstKeys.length === secondKeys.length &&
    firstKeys.every(
      (assetId) =>
        Object.prototype.hasOwnProperty.call(second, assetId) &&
        first[assetId] === second[assetId],
    )
  );
}

export function BatchSellReview() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const tw = useTailwind();
  const selectedTokens = useSelector(selectBatchSellSourceTokens);
  const sourceChainId = selectedTokens[0]?.chainId;
  const destinationTokens = useSelector((state: RootState) =>
    selectBatchSellDestStablecoins(state, sourceChainId),
  );
  const selectedDestinationToken = useSelector(selectBatchSellDestToken);
  const batchSellSlippages = useSelector(selectBatchSellSlippages);
  const isRemoveTokenDisabled = selectedTokens.length <= 2;
  const [percentsByTokenKey, setPercentsByTokenKey] = useState<
    Record<string, number>
  >({});

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

  // Reset bridge state when component unmounts.
  useEffect(
    () => () => {
      dispatch(resetBridgeState());
    },
    [dispatch],
  );

  useEffect(() => {
    // Keep Redux slippages aligned with selected tokens when the user removes tokens.
    const nextSlippage = selectedTokens.reduce<
      Record<string, string | undefined>
    >((slippageByAssetId, token) => {
      const assetId = getBridgeTokenAssetId(token);

      if (!assetId) return slippageByAssetId;

      slippageByAssetId[assetId] = getBatchSellSlippage(
        batchSellSlippages,
        assetId,
      );
      return slippageByAssetId;
    }, {});

    if (!areBatchSellSlippageMapsEqual(batchSellSlippages, nextSlippage)) {
      dispatch(setBatchSellTokenSlippages(nextSlippage));
    }
  }, [batchSellSlippages, dispatch, selectedTokens]);

  const handlePercentChange = useCallback(
    (tokenKey: string, percent: number) => {
      setPercentsByTokenKey((currentPercents) => ({
        ...currentPercents,
        [tokenKey]: percent,
      }));
    },
    [],
  );

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleOpenDestinationTokenSelector = useCallback(() => {
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.BATCH_SELL_DESTINATION_TOKEN_SELECTOR_MODAL,
    });
  }, [navigation]);

  const getQuoteDetailsParams = useCallback(() => {
    const destinationTokenSymbol =
      selectedDestinationToken?.symbol ?? UNKNOWN_DESTINATION_TOKEN_SYMBOL;
    const placeholderAmount = `${QUOTE_DETAILS_PLACEHOLDER_AMOUNT} ${destinationTokenSymbol}`;

    return {
      tokenData: selectedTokens.map((token) => {
        const assetId = getBridgeTokenAssetId(token);
        const slippage = assetId
          ? getBatchSellSlippage(batchSellSlippages, assetId)
          : DEFAULT_BATCH_SELL_SLIPPAGE;

        return {
          key: getTokenKey(token),
          tokenSymbol: token.symbol,
          slippage: getSlippageDisplayValue(slippage),
          receivedAmount: placeholderAmount,
        };
      }),
      totalReceived: placeholderAmount,
      minimumReceived: placeholderAmount,
      isLoading: !HAS_QUOTES,
    };
  }, [batchSellSlippages, selectedDestinationToken?.symbol, selectedTokens]);

  const handleOpenQuoteDetails = useCallback(() => {
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.BATCH_SELL_QUOTE_DETAILS_MODAL,
      params: getQuoteDetailsParams(),
    });
  }, [getQuoteDetailsParams, navigation]);

  const handleOpenFinalReview = useCallback(() => {
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.BATCH_SELL_FINAL_REVIEW_MODAL,
      params: {
        ...getQuoteDetailsParams(),
        sourceTokens: selectedTokens.map(getSourceTokenData),
        networkFee: NETWORK_FEE_PLACEHOLDER,
        networkFeeFiat: NETWORK_FEE_FIAT_PLACEHOLDER,
        metamaskFeePercent: METAMASK_FEE_PERCENT,
      },
    });
  }, [getQuoteDetailsParams, navigation, selectedTokens]);

  const handleSlippagePress = useCallback(
    (token: BridgeToken) => {
      const assetId = getBridgeTokenAssetId(token);

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
        <Box twClassName="px-4 pb-6">
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
            twClassName="mt-2"
          >
            <Skeleton
              width={195}
              height={50}
              style={tw.style('rounded-lg')}
              testID={BatchSellReviewSelectorsIDs.TOTAL_RECEIVED_SKELETON}
            />
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Md}
              testID={BatchSellReviewSelectorsIDs.DESTINATION_TOKEN_PILL}
              onPress={handleOpenDestinationTokenSelector}
              style={tw.style('rounded-xl px-3 py-3')}
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

            return (
              <BatchSellReviewTokenRow
                key={tokenKey}
                token={token}
                tokenKey={tokenKey}
                percent={percentsByTokenKey[tokenKey] ?? DEFAULT_PERCENT}
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
            isDisabled={!HAS_QUOTES}
            onPress={handleOpenFinalReview}
            testID={BatchSellReviewSelectorsIDs.REVIEW_BUTTON}
          >
            {strings('bridge.batch_sell_review')}
          </Button>
        </Box>
      </Box>
    </SafeAreaView>
  );
}
