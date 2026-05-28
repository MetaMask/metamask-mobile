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
  isLoading,
}: {
  tokenData: BatchSellQuoteDetailsTokenData;
  isLoading?: boolean;
}) {
  const rowKey = tokenData.key ?? tokenData.tokenSymbol;

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
      {isLoading ? (
        <Skeleton
          width={VALUE_SKELETON_WIDTH}
          height={VALUE_SKELETON_HEIGHT}
          twClassName="rounded-lg"
          testID={`${BatchSellQuoteDetailsModalSelectorsIDs.QUOTE_ROW_RECEIVED_AMOUNT_SKELETON}-${rowKey}`}
        />
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

function SummaryRow({
  label,
  value,
  testID,
  hasInfoIcon = false,
  onInfoPress,
  isLoading,
  skeletonTestID,
}: {
  label: string;
  value: string;
  testID: string;
  hasInfoIcon?: boolean;
  onInfoPress?: () => void;
  isLoading?: boolean;
  skeletonTestID?: string;
}) {
  return (
    <Box
      testID={testID}
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      gap={2}
      paddingVertical={2}
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
          {label}
        </Text>
        {hasInfoIcon ? (
          onInfoPress ? (
            <Pressable
              onPress={onInfoPress}
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
          )
        ) : null}
      </Box>
      {isLoading ? (
        <Skeleton
          width={VALUE_SKELETON_WIDTH}
          height={VALUE_SKELETON_HEIGHT}
          twClassName="rounded-lg"
          testID={skeletonTestID}
        />
      ) : (
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.SuccessDefault}
          numberOfLines={1}
        >
          {value}
        </Text>
      )}
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
              isLoading={isLoading}
            />
          ))}
        </Box>
      ) : null}
      <Box paddingHorizontal={4}>
        <Box twClassName="border-t border-muted pt-2">
          <SummaryRow
            label={strings('bridge.batch_sell_total_received')}
            value={totalReceived}
            testID={BatchSellQuoteDetailsModalSelectorsIDs.TOTAL_RECEIVED_ROW}
            isLoading={isLoading}
            skeletonTestID={
              BatchSellQuoteDetailsModalSelectorsIDs.TOTAL_RECEIVED_SKELETON
            }
          />
          <SummaryRow
            label={strings('bridge.batch_sell_minimum_received')}
            value={minimumReceived}
            testID={BatchSellQuoteDetailsModalSelectorsIDs.MINIMUM_RECEIVED_ROW}
            hasInfoIcon
            onInfoPress={onMinimumReceivedInfoPress}
            isLoading={isLoading}
            skeletonTestID={
              BatchSellQuoteDetailsModalSelectorsIDs.MINIMUM_RECEIVED_SKELETON
            }
          />
        </Box>
      </Box>
    </Box>
  );
}
