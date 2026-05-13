import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { BatchSellQuoteDetailsModalSelectorsIDs } from './BatchSellQuoteDetailsModal.testIds';
import {
  BatchSellQuoteDetailsProps,
  BatchSellQuoteDetailsTokenData,
} from './BatchSellQuoteDetailsModal.types';
import { strings } from '../../../../../../locales/i18n';

function QuoteDetailsRow({ row }: { row: BatchSellQuoteDetailsTokenData }) {
  const rowKey = row.key ?? row.tokenSymbol;

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
          tokenSymbol: row.tokenSymbol,
          slippage: row.slippage,
        })}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextDefault}
        numberOfLines={1}
      >
        {row.receivedAmount}
      </Text>
    </Box>
  );
}

function SummaryRow({
  label,
  value,
  testID,
  hasInfoIcon = false,
  onInfoPress,
}: {
  label: string;
  value: string;
  testID: string;
  hasInfoIcon?: boolean;
  onInfoPress?: () => void;
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
        gap={2}
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
            <ButtonIcon
              iconName={IconName.Info}
              iconProps={{ color: IconColor.IconAlternative }}
              size={ButtonIconSize.Sm}
              onPress={onInfoPress}
              testID={
                BatchSellQuoteDetailsModalSelectorsIDs.MINIMUM_RECEIVED_INFO_BUTTON
              }
            />
          ) : (
            <Icon
              name={IconName.Info}
              size={IconSize.Sm}
              color={IconColor.IconAlternative}
            />
          )
        ) : null}
      </Box>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.SuccessDefault}
        numberOfLines={1}
      >
        {value}
      </Text>
    </Box>
  );
}

export function BatchSellQuoteDetails({
  tokenData,
  totalReceived,
  minimumReceived,
  onMinimumReceivedInfoPress,
}: BatchSellQuoteDetailsProps) {
  return (
    <Box twClassName="pb-4">
      <Box paddingTop={2} paddingBottom={2}>
        {tokenData.map((row) => (
          <QuoteDetailsRow key={row.key ?? row.tokenSymbol} row={row} />
        ))}
      </Box>
      <Box paddingHorizontal={4}>
        <Box twClassName="border-t border-muted pt-2">
          <SummaryRow
            label={strings('bridge.batch_sell_total_received')}
            value={totalReceived}
            testID={BatchSellQuoteDetailsModalSelectorsIDs.TOTAL_RECEIVED_ROW}
          />
          <SummaryRow
            label={strings('bridge.batch_sell_minimum_received')}
            value={minimumReceived}
            testID={BatchSellQuoteDetailsModalSelectorsIDs.MINIMUM_RECEIVED_ROW}
            hasInfoIcon
            onInfoPress={onMinimumReceivedInfoPress}
          />
        </Box>
      </Box>
    </Box>
  );
}
