import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useMemo, useState } from 'react';
import { Pressable } from 'react-native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { formatAddressToAssetId } from '@metamask/bridge-controller';
import {
  AvatarToken,
  AvatarTokenSize,
  BottomSheet,
  BottomSheetHeader,
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
import { selectBatchSellSourceTokens } from '../../../../../core/redux/slices/bridge';
import {
  BatchSellQuoteTokenData,
  useBatchSellQuoteData,
} from '../../hooks/useBatchSellQuoteData';
import { BridgeToken } from '../../types';
import { BatchSellQuoteDetails } from '../BatchSellQuoteDetailsModal';
import { BatchSellFinalReviewModalSelectorsIDs } from './BatchSellFinalReviewModal.testIds';
import { BatchSellFinalReviewSourceTokenData } from './BatchSellFinalReviewModal.types';

const MAX_VISIBLE_SOURCE_TOKEN_AVATARS = 5;
const SOURCE_TOKEN_AVATAR_OVERLAP = 12;
const NETWORK_FEE_VALUES_SKELETON_WIDTH = 150;
const NETWORK_FEE_SKELETON_HEIGHT = 24;
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

function isQuotedTokenData(
  tokenData: BatchSellQuoteTokenData | undefined,
): tokenData is BatchSellQuoteTokenData {
  return Boolean(
    tokenData && !tokenData.isLoading && !tokenData.isQuoteUnavailable,
  );
}

function shouldShowFinalReviewQuoteRow(
  tokenData: BatchSellQuoteTokenData | undefined,
  isLoading: boolean,
): tokenData is BatchSellQuoteTokenData {
  return Boolean(tokenData && (isLoading || isQuotedTokenData(tokenData)));
}

function SourceTokenAvatarStack({
  sourceTokens,
}: {
  sourceTokens: BatchSellFinalReviewSourceTokenData[];
}) {
  const tw = useTailwind();

  return (
    <Box flexDirection={BoxFlexDirection.Row} alignItems={BoxAlignItems.Center}>
      {sourceTokens
        .slice(0, MAX_VISIBLE_SOURCE_TOKEN_AVATARS)
        .map((sourceToken, index) => (
          <Box
            key={sourceToken.key}
            style={
              index === 0
                ? undefined
                : tw.style({ marginLeft: -SOURCE_TOKEN_AVATAR_OVERLAP })
            }
          >
            <AvatarToken
              name={sourceToken.tokenSymbol}
              src={sourceToken.image ? { uri: sourceToken.image } : undefined}
              size={AvatarTokenSize.Sm}
              testID={`${BatchSellFinalReviewModalSelectorsIDs.SOURCE_TOKEN_AVATAR}-${sourceToken.key}`}
            />
          </Box>
        ))}
    </Box>
  );
}

function YouSellRow({
  sourceTokens,
  isTokenDetailsExpanded,
  onToggleTokenDetails,
}: {
  sourceTokens: BatchSellFinalReviewSourceTokenData[];
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
  networkFeeFiat,
  isLoading,
  onInfoPress,
}: {
  networkFee: string;
  networkFeeFiat: string;
  isLoading: boolean;
  onInfoPress: () => void;
}) {
  return (
    <Box
      testID={BatchSellFinalReviewModalSelectorsIDs.NETWORK_FEE_ROW}
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      paddingHorizontal={4}
      paddingVertical={3}
      twClassName="border-t border-muted"
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={1}
      >
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
        >
          {strings('bridge.network_fee')}
        </Text>
        <Pressable
          onPress={onInfoPress}
          testID={BatchSellFinalReviewModalSelectorsIDs.NETWORK_FEE_INFO_BUTTON}
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
              color={TextColor.TextAlternative}
              numberOfLines={1}
            >
              {networkFee}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
              numberOfLines={1}
            >
              {networkFeeFiat}
            </Text>
          </>
        )}
      </Box>
    </Box>
  );
}

export function BatchSellFinalReviewModal() {
  const navigation =
    useNavigation<StackNavigationProp<Record<string, object | undefined>>>();
  const selectedTokens = useSelector(selectBatchSellSourceTokens);
  const batchSellQuoteData = useBatchSellQuoteData({
    shouldUpdateBatchSellTrades: false,
  });
  const [isTokenDetailsExpanded, setIsTokenDetailsExpanded] = useState(true);
  const quotedQuoteRows = useMemo(
    () =>
      selectedTokens.reduce<
        { token: BridgeToken; tokenData: BatchSellQuoteTokenData }[]
      >((quoteRows, token) => {
        const assetId = formatAddressToAssetId(token.address, token.chainId);
        const tokenQuoteData = assetId
          ? batchSellQuoteData.tokenData[assetId]
          : undefined;

        if (
          shouldShowFinalReviewQuoteRow(
            tokenQuoteData,
            batchSellQuoteData.isLoading,
          )
        ) {
          quoteRows.push({ token, tokenData: tokenQuoteData });
        }

        return quoteRows;
      }, []),
    [
      batchSellQuoteData.isLoading,
      batchSellQuoteData.tokenData,
      selectedTokens,
    ],
  );
  const quoteTokenData = useMemo(
    () => quotedQuoteRows.map(({ tokenData }) => tokenData),
    [quotedQuoteRows],
  );
  const sourceTokens = useMemo(
    () => quotedQuoteRows.map(({ token }) => getSourceTokenData(token)),
    [quotedQuoteRows],
  );
  const isSellAllDisabled =
    batchSellQuoteData.isLoading ||
    batchSellQuoteData.networkFeeIsLoading ||
    !batchSellQuoteData.hasAnyQuote ||
    batchSellQuoteData.hasPendingQuoteRows;

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

  return (
    <BottomSheet
      testID={BatchSellFinalReviewModalSelectorsIDs.SHEET}
      goBack={navigation.goBack}
    >
      <BottomSheetHeader
        onClose={navigation.goBack}
        closeButtonProps={{
          size: ButtonIconSize.Md,
          testID: BatchSellFinalReviewModalSelectorsIDs.CLOSE_BUTTON,
        }}
      >
        {strings('bridge.batch_sell_review')}
      </BottomSheetHeader>
      <YouSellRow
        sourceTokens={sourceTokens}
        isTokenDetailsExpanded={isTokenDetailsExpanded}
        onToggleTokenDetails={handleToggleTokenDetails}
      />
      <BatchSellQuoteDetails
        tokenData={quoteTokenData}
        totalReceived={batchSellQuoteData.totalReceived}
        minimumReceived={batchSellQuoteData.minimumReceived}
        isLoading={batchSellQuoteData.isSummaryLoading}
        isTokenDetailsExpanded={isTokenDetailsExpanded}
        onMinimumReceivedInfoPress={handleOpenMinimumReceivedInfo}
      />
      <NetworkFeeRow
        networkFee={batchSellQuoteData.networkFee}
        networkFeeFiat={batchSellQuoteData.networkFeeFiat}
        isLoading={batchSellQuoteData.networkFeeIsLoading}
        onInfoPress={handleOpenNetworkFeeInfo}
      />
      <Box paddingHorizontal={4} paddingTop={4} paddingBottom={4} gap={2}>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isDisabled={isSellAllDisabled}
          testID={BatchSellFinalReviewModalSelectorsIDs.SELL_ALL_BUTTON}
        >
          {strings('bridge.batch_sell_sell_all')}
        </Button>
        <Text
          variant={TextVariant.BodyXs}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          twClassName="text-center"
          testID={BatchSellFinalReviewModalSelectorsIDs.METAMASK_FEE_DISCLOSURE}
        >
          {strings('bridge.batch_sell_includes_metamask_fee', {
            fee: METAMASK_FEE_PERCENT,
          })}
        </Text>
      </Box>
    </BottomSheet>
  );
}
