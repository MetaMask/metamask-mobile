import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { formatAddressToAssetId } from '@metamask/bridge-controller';
import {
  AvatarToken,
  AvatarTokenSize,
  BottomSheet,
  BottomSheetHeader,
  BottomSheetRef,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonIconSize,
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

import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import {
  selectBatchSellSourceTokens,
  selectIsSubmittingTx,
  setIsSubmittingTx,
} from '../../../../../core/redux/slices/bridge';
import {
  type BatchSellQuoteTokenData,
  useBatchSellQuoteData,
} from '../../hooks/useBatchSellQuoteData';
import { useBatchSellQuoteRequest } from '../../hooks/useBatchSellQuoteRequest';
import { useBatchSellHasSufficientGas } from '../../hooks/useBatchSellHasSufficientGas';
import { useSubmitBatchSellTx } from '../../hooks/useSubmitBatchSellTx';
import type { BridgeToken } from '../../types';
import { BatchSellQuoteDetails } from '../BatchSellQuoteDetailsModal';
import { BatchSellFinalReviewModalSelectorsIDs } from './BatchSellFinalReviewModal.testIds';
import { useElevatedSurface } from '../../../../../util/theme/themeUtils';

const MAX_VISIBLE_SOURCE_TOKEN_AVATARS = 5;
const SOURCE_TOKEN_AVATAR_OVERLAP = 12;
const NETWORK_FEE_VALUES_SKELETON_WIDTH = 150;
const NETWORK_FEE_SKELETON_HEIGHT = 24;

const getTokenKey = (token: BridgeToken) => `${token.chainId}:${token.address}`;

interface FinalReviewQuoteData {
  sourceTokens: BridgeToken[];
  tokenData: BatchSellQuoteTokenData[];
}

function getFinalReviewQuoteData({
  isLoading,
  sourceTokens,
  tokenDataByAssetId,
}: {
  isLoading: boolean;
  sourceTokens: BridgeToken[];
  tokenDataByAssetId: Record<string, BatchSellQuoteTokenData>;
}) {
  return sourceTokens.reduce<FinalReviewQuoteData>(
    (quoteData, sourceToken) => {
      const assetId = formatAddressToAssetId(
        sourceToken.address,
        sourceToken.chainId,
      );
      const tokenData = assetId ? tokenDataByAssetId[assetId] : undefined;

      if (
        !tokenData ||
        (!isLoading && (tokenData.isLoading || tokenData.isQuoteUnavailable))
      ) {
        return quoteData;
      }

      quoteData.sourceTokens.push(sourceToken);
      quoteData.tokenData.push(tokenData);

      return quoteData;
    },
    { sourceTokens: [], tokenData: [] },
  );
}

function SourceTokenAvatarStack({
  sourceTokens,
}: {
  sourceTokens: BridgeToken[];
}) {
  const tw = useTailwind();

  return (
    <Box flexDirection={BoxFlexDirection.Row} alignItems={BoxAlignItems.Center}>
      {sourceTokens
        .slice(0, MAX_VISIBLE_SOURCE_TOKEN_AVATARS)
        .map((sourceToken, index) => {
          const sourceTokenKey = getTokenKey(sourceToken);

          return (
            <Box
              key={`${sourceTokenKey}-${index}`}
              style={
                index === 0
                  ? undefined
                  : tw.style({ marginLeft: -SOURCE_TOKEN_AVATAR_OVERLAP })
              }
            >
              <AvatarToken
                name={sourceToken.symbol}
                src={sourceToken.image ? { uri: sourceToken.image } : undefined}
                size={AvatarTokenSize.Sm}
                testID={`${BatchSellFinalReviewModalSelectorsIDs.SOURCE_TOKEN_AVATAR}-${sourceTokenKey}`}
              />
            </Box>
          );
        })}
    </Box>
  );
}

function YouSellRow({
  sourceTokens,
  isTokenDetailsExpanded,
  onToggleTokenDetails,
}: {
  sourceTokens: BridgeToken[];
  isTokenDetailsExpanded: boolean;
  onToggleTokenDetails: () => void;
}) {
  const tw = useTailwind();

  return (
    <Box
      testID={BatchSellFinalReviewModalSelectorsIDs.YOU_SELL_ROW}
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      gap={1}
      paddingHorizontal={4}
      paddingVertical={3}
    >
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
      >
        {strings('bridge.batch_sell_you_sell')}
      </Text>
      <Pressable
        onPress={onToggleTokenDetails}
        accessibilityLabel={strings('bridge.batch_sell_toggle_you_sell')}
        accessibilityRole="button"
        testID={BatchSellFinalReviewModalSelectorsIDs.YOU_SELL_TOGGLE_BUTTON}
        style={({ pressed }) =>
          tw.style('flex-row items-center gap-2 bg-transparent p-0', {
            opacity: pressed ? 0.7 : 1,
          })
        }
      >
        <SourceTokenAvatarStack sourceTokens={sourceTokens} />
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
        >
          {strings('bridge.batch_sell_token_count', {
            tokenCount: sourceTokens.length,
          })}
        </Text>
        <Icon
          name={isTokenDetailsExpanded ? IconName.ArrowUp : IconName.ArrowDown}
          size={IconSize.Sm}
          color={IconColor.IconAlternative}
        />
      </Pressable>
    </Box>
  );
}

function NetworkFeeRow({
  networkFee,
  hasInsufficientGas,
  isLoading,
  onInfoPress,
}: {
  networkFee: {
    formatted: string;
    formattedFiat: string;
  };
  hasInsufficientGas: boolean;
  isLoading: boolean;
  onInfoPress: () => void;
}) {
  const textColor = hasInsufficientGas
    ? TextColor.ErrorDefault
    : TextColor.TextAlternative;
  const fiatTextColor = hasInsufficientGas
    ? TextColor.ErrorDefault
    : TextColor.TextDefault;

  return (
    <>
      <Box twClassName="border-t border-muted mx-4" />
      <Box
        testID={BatchSellFinalReviewModalSelectorsIDs.NETWORK_FEE_ROW}
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        paddingHorizontal={4}
        paddingVertical={3}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={1}
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={textColor}
          >
            {strings('bridge.network_fee')}
          </Text>
          <Pressable
            onPress={onInfoPress}
            testID={
              BatchSellFinalReviewModalSelectorsIDs.NETWORK_FEE_INFO_BUTTON
            }
            accessibilityRole="button"
          >
            <Icon
              name={IconName.Info}
              size={IconSize.Sm}
              color={IconColor.IconAlternative}
            />
          </Pressable>
        </Box>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.End}
          gap={2}
          twClassName="min-w-0 flex-1"
        >
          {isLoading ? (
            <Skeleton
              width={NETWORK_FEE_VALUES_SKELETON_WIDTH}
              height={NETWORK_FEE_SKELETON_HEIGHT}
              twClassName="rounded-lg"
              testID={
                BatchSellFinalReviewModalSelectorsIDs.NETWORK_FEE_VALUES_SKELETON
              }
            />
          ) : (
            <>
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={textColor}
                numberOfLines={1}
              >
                {networkFee.formatted}
              </Text>
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={fiatTextColor}
                numberOfLines={1}
              >
                {networkFee.formattedFiat}
              </Text>
            </>
          )}
        </Box>
      </Box>
    </>
  );
}

export function BatchSellFinalReviewModal() {
  const dispatch = useDispatch();
  const navigation =
    useNavigation<StackNavigationProp<Record<string, object | undefined>>>();
  const selectedTokens = useSelector(selectBatchSellSourceTokens);
  const isSubmittingTx = useSelector(selectIsSubmittingTx);
  const batchSellQuoteData = useBatchSellQuoteData({
    shouldUpdateBatchSellTrades: false,
  });
  const { getNewQuote } = useBatchSellQuoteRequest();
  const { submitBatchSellTx } = useSubmitBatchSellTx();
  const hasSufficientGas = useBatchSellHasSufficientGas({
    isGasless: batchSellQuoteData.isGasless,
    networkFee: batchSellQuoteData.networkFee,
  });
  const surfaceClass = useElevatedSurface();
  const sheetRef = useRef<BottomSheetRef>(null);
  const [isTokenDetailsExpanded, setIsTokenDetailsExpanded] = useState(false);
  const finalReviewQuoteData = useMemo(
    () =>
      getFinalReviewQuoteData({
        isLoading: batchSellQuoteData.isLoading,
        sourceTokens: selectedTokens,
        tokenDataByAssetId: batchSellQuoteData.tokenData,
      }),
    [
      batchSellQuoteData.isLoading,
      batchSellQuoteData.tokenData,
      selectedTokens,
    ],
  );
  const isBatchSellTradesLoading = batchSellQuoteData.isBatchSellTradesLoading;
  const isNetworkFeeUnavailable = batchSellQuoteData.isNetworkFeeUnavailable;
  const hasInsufficientGaslessDestinationToken =
    batchSellQuoteData.isGasless &&
    !isBatchSellTradesLoading &&
    !batchSellQuoteData.isBatchSellTradeAvailable;
  const hasInsufficientGas =
    !isNetworkFeeUnavailable &&
    (hasSufficientGas === false || hasInsufficientGaslessDestinationToken);
  const hasNetworkFeeError = hasInsufficientGas || isNetworkFeeUnavailable;
  const isSellAllDisabled =
    batchSellQuoteData.isLoading ||
    isBatchSellTradesLoading ||
    !batchSellQuoteData.isBatchSellTradeAvailable ||
    !batchSellQuoteData.hasAnyQuote ||
    batchSellQuoteData.hasPendingQuoteRows ||
    isSubmittingTx ||
    isNetworkFeeUnavailable ||
    hasInsufficientGas;
  const isButtonDisabled = batchSellQuoteData.needsNewQuote
    ? false
    : isSellAllDisabled;
  const isSellAllLoading =
    !batchSellQuoteData.needsNewQuote &&
    isSellAllDisabled &&
    (batchSellQuoteData.isLoading ||
      isBatchSellTradesLoading ||
      isSubmittingTx ||
      batchSellQuoteData.hasPendingQuoteRows);
  const actionButtonLabel = (() => {
    if (batchSellQuoteData.needsNewQuote) {
      return strings('quote_expired_modal.get_new_quote');
    }

    if (isNetworkFeeUnavailable) {
      return strings('bridge.insufficient_balance');
    }

    if (hasInsufficientGas) {
      return strings('bridge.insufficient_funds');
    }

    if (isSubmittingTx) {
      return strings('bridge.submitting_transaction');
    }

    return strings('bridge.batch_sell_sell_all');
  })();

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleToggleTokenDetails = () => {
    setIsTokenDetailsExpanded((isExpanded) => !isExpanded);
  };

  const handleOpenMinimumReceivedInfo = () => {
    navigation.replace(
      Routes.BRIDGE.MODALS.BATCH_SELL_MINIMUM_RECEIVED_INFO_MODAL,
      {
        sourceModal: {
          screen: Routes.BRIDGE.MODALS.BATCH_SELL_FINAL_REVIEW_MODAL,
        },
      },
    );
  };

  const handleOpenNetworkFeeInfo = () => {
    navigation.replace(Routes.BRIDGE.MODALS.BATCH_SELL_NETWORK_FEE_INFO_MODAL, {
      sourceModal: {
        screen: Routes.BRIDGE.MODALS.BATCH_SELL_FINAL_REVIEW_MODAL,
      },
    });
  };

  const handleSellAll = useCallback(async () => {
    try {
      dispatch(setIsSubmittingTx(true));

      await submitBatchSellTx({
        quoteResponses: batchSellQuoteData.recommendedQuotes,
      });
    } catch (error) {
      console.error('Error submitting Batch Sell tx', error);
    } finally {
      dispatch(setIsSubmittingTx(false));
      sheetRef.current?.onCloseBottomSheet(() => {
        navigation.navigate(Routes.TRANSACTIONS_VIEW);
      });
    }
  }, [
    batchSellQuoteData.recommendedQuotes,
    dispatch,
    navigation,
    submitBatchSellTx,
  ]);

  return (
    <BottomSheet
      ref={sheetRef}
      testID={BatchSellFinalReviewModalSelectorsIDs.SHEET}
      goBack={navigation.goBack}
      twClassName={surfaceClass}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          size: ButtonIconSize.Md,
          testID: BatchSellFinalReviewModalSelectorsIDs.CLOSE_BUTTON,
        }}
      >
        {strings('bridge.batch_sell_review')}
      </BottomSheetHeader>
      <YouSellRow
        sourceTokens={finalReviewQuoteData.sourceTokens}
        isTokenDetailsExpanded={isTokenDetailsExpanded}
        onToggleTokenDetails={handleToggleTokenDetails}
      />
      <BatchSellQuoteDetails
        tokenData={finalReviewQuoteData.tokenData}
        totalReceived={batchSellQuoteData.totalReceived}
        minimumReceived={batchSellQuoteData.minimumReceived}
        isLoading={batchSellQuoteData.isSummaryLoading}
        isTokenDetailsExpanded={isTokenDetailsExpanded}
        onMinimumReceivedInfoPress={handleOpenMinimumReceivedInfo}
      />
      <NetworkFeeRow
        networkFee={batchSellQuoteData.networkFee}
        hasInsufficientGas={hasNetworkFeeError}
        isLoading={isBatchSellTradesLoading}
        onInfoPress={handleOpenNetworkFeeInfo}
      />
      <Box paddingHorizontal={4} paddingTop={4} paddingBottom={4} gap={2}>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isDisabled={isButtonDisabled}
          isLoading={isSellAllLoading}
          onPress={
            batchSellQuoteData.needsNewQuote ? getNewQuote : handleSellAll
          }
          testID={BatchSellFinalReviewModalSelectorsIDs.SELL_ALL_BUTTON}
        >
          {actionButtonLabel}
        </Button>
        {batchSellQuoteData.quotePercentFee ? (
          <Text
            variant={TextVariant.BodyXs}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
            twClassName="text-center"
            testID={
              BatchSellFinalReviewModalSelectorsIDs.METAMASK_FEE_DISCLOSURE
            }
          >
            {strings('bridge.batch_sell_includes_metamask_fee', {
              fee: batchSellQuoteData.quotePercentFee,
            })}
          </Text>
        ) : null}
      </Box>
    </BottomSheet>
  );
}
