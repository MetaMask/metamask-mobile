import React from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import { BatchSellQuoteDetailsModalSelectorsIDs } from './BatchSellQuoteDetailsModal.testIds';
import {
  BatchSellQuoteDetailsProps,
  BatchSellQuoteDetailsTokenData,
} from './BatchSellQuoteDetailsModal.types';
import { strings } from '../../../../../../locales/i18n';

const VALUE_SKELETON_WIDTH = 114;
const VALUE_SKELETON_HEIGHT = 24;

function QuoteDetailsRow({
  tokenData,
}: {
  tokenData: BatchSellQuoteDetailsTokenData;
}) {
  const rowKey = tokenData.key ?? tokenData.tokenSymbol;
  const isRowLoading = tokenData.isLoading;
  const isRowQuoteUnavailable = tokenData.isQuoteUnavailable && !isRowLoading;

  return (
    <Box
      testID={`${BatchSellQuoteDetailsModalSelectorsIDs.QUOTE_ROW}-${rowKey}`}
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      gap={2}
      paddingHorizontal={4}
      paddingVertical={2}
      twClassName="w-full"
    >
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
        numberOfLines={1}
        twClassName="min-w-0 flex-1"
      >
        {strings('bridge.batch_sell_quote_details_row', {
          tokenSymbol: tokenData.tokenSymbol,
          slippage: tokenData.slippage,
        })}
      </Text>
      {isRowLoading ? (
        <Skeleton
          width={VALUE_SKELETON_WIDTH}
          height={VALUE_SKELETON_HEIGHT}
          twClassName="rounded-lg"
          testID={`${BatchSellQuoteDetailsModalSelectorsIDs.QUOTE_ROW_RECEIVED_AMOUNT_SKELETON}-${rowKey}`}
        />
      ) : isRowQuoteUnavailable ? (
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.ErrorDefault}
          numberOfLines={1}
        >
          {strings('bridge.batch_sell_no_quote_available')}
        </Text>
      ) : (
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
          numberOfLines={1}
        >
          {tokenData.receivedAmount}
        </Text>
      )}
    </Box>
  );
}

export function TotalReceivedSummaryRow({
  totalReceived,
  minimumReceived,
  isLoading = false,
  onMinimumReceivedInfoPress,
}: {
  totalReceived: { formatted: string };
  minimumReceived: { formatted: string };
  isLoading?: boolean;
  onMinimumReceivedInfoPress?: () => void;
}) {
  return (
    <Box
      testID={BatchSellQuoteDetailsModalSelectorsIDs.TOTAL_RECEIVED_ROW}
      paddingVertical={2}
      gap={1}
      twClassName="w-full"
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        gap={2}
        twClassName="w-full"
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={1}
          twClassName="min-w-0 flex-1"
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
            numberOfLines={1}
          >
            {strings('bridge.batch_sell_total_received')}
          </Text>
          {onMinimumReceivedInfoPress ? (
            <Pressable
              onPress={onMinimumReceivedInfoPress}
              testID={
                BatchSellQuoteDetailsModalSelectorsIDs.MINIMUM_RECEIVED_INFO_BUTTON
              }
              accessibilityRole="button"
            >
              <Icon
                name={IconName.Info}
                size={IconSize.Sm}
                color={IconColor.IconAlternative}
              />
            </Pressable>
          ) : (
            <Icon
              name={IconName.Info}
              size={IconSize.Sm}
              color={IconColor.IconAlternative}
            />
          )}
        </Box>
        {isLoading ? (
          <Skeleton
            width={VALUE_SKELETON_WIDTH}
            height={VALUE_SKELETON_HEIGHT}
            twClassName="rounded-lg"
            testID={
              BatchSellQuoteDetailsModalSelectorsIDs.TOTAL_RECEIVED_SKELETON
            }
          />
        ) : (
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.SuccessDefault}
            numberOfLines={1}
          >
            {totalReceived.formatted}
          </Text>
        )}
      </Box>
      <Box
        testID={BatchSellQuoteDetailsModalSelectorsIDs.MINIMUM_RECEIVED_ROW}
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.End}
        gap={1}
        twClassName="w-full"
      >
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          numberOfLines={1}
        >
          {strings('bridge.batch_sell_minimum_received')}
        </Text>
        {isLoading ? (
          <Skeleton
            width={VALUE_SKELETON_WIDTH}
            height={VALUE_SKELETON_HEIGHT}
            twClassName="rounded-lg"
            testID={
              BatchSellQuoteDetailsModalSelectorsIDs.MINIMUM_RECEIVED_SKELETON
            }
          />
        ) : (
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
            numberOfLines={1}
          >
            {minimumReceived.formatted}
          </Text>
        )}
      </Box>
    </Box>
  );
}

export function BatchSellQuoteDetails({
  tokenData,
  totalReceived,
  minimumReceived,
  isLoading = false,
  isTokenDetailsExpanded = true,
  onMinimumReceivedInfoPress,
}: BatchSellQuoteDetailsProps) {
  return (
    <Box twClassName="pb-4">
      {isTokenDetailsExpanded ? (
        <Box paddingTop={2} paddingBottom={2}>
          {tokenData.map((token) => (
            <QuoteDetailsRow
              key={token.key ?? token.tokenSymbol}
              tokenData={token}
            />
          ))}
        </Box>
      ) : null}
      <Box paddingHorizontal={4}>
        <Box twClassName="border-t border-muted pt-2">
          <TotalReceivedSummaryRow
            totalReceived={totalReceived}
            minimumReceived={minimumReceived}
            isLoading={isLoading}
            onMinimumReceivedInfoPress={onMinimumReceivedInfoPress}
          />
        </Box>
      </Box>
    </Box>
  );
}
