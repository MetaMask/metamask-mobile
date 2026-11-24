import React from 'react';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  selectSourceAmount,
  selectSourceToken,
  selectBridgeControllerState,
  selectRecurringEveryUnit,
  selectRecurringEveryValue,
  selectRecurringRepeatCount,
} from '../../../../../../core/redux/slices/bridge';
import { useBridgeQuoteDataContext } from '../../../hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { SwapsRecurringBuyConfirmButton } from '../../../components/SwapsRecurringBuyConfirmButton/index.tsx';
import { BridgeViewSelectorsIDs } from '../BridgeView.testIds';
import { formatMinimumReceived } from '../../../utils/currencyUtils';
import { parsePositiveInteger } from '../../../utils/recurringSchedule';

interface BridgeRecurringBuyFooterViewProps {
  onPreviewOrder: () => void;
  label: string;
  destinationTokenSymbol?: string;
  isBelowMinAmount: boolean;
  isPreviewDisabled?: boolean;
}

export const BridgeRecurringBuyFooterView = ({
  onPreviewOrder,
  label,
  destinationTokenSymbol,
  isBelowMinAmount,
  isPreviewDisabled,
}: BridgeRecurringBuyFooterViewProps) => {
  const { bottom: bottomInset } = useSafeAreaInsets();
  const sourceAmount = useSelector(selectSourceAmount);
  const sourceToken = useSelector(selectSourceToken);
  const everyValue = useSelector(selectRecurringEveryValue);
  const everyUnit = useSelector(selectRecurringEveryUnit);
  const repeatCount = useSelector(selectRecurringRepeatCount);
  const { activeQuote, isLoading } = useBridgeQuoteDataContext();
  const { quotesLastFetched } = useSelector(selectBridgeControllerState);

  const isValidSourceAmount =
    sourceAmount !== undefined && sourceAmount !== '.' && sourceToken?.decimals;
  const isQuoteLoading = isLoading && !isBelowMinAmount;
  const isInitialQuoteLoading = isQuoteLoading && !activeQuote;

  const parsedEveryValue = parsePositiveInteger(everyValue);
  const parsedRepeatCount = parsePositiveInteger(repeatCount);
  const spendSummaryValues =
    isValidSourceAmount &&
    parsedEveryValue !== undefined &&
    parsedRepeatCount !== undefined &&
    sourceAmount &&
    sourceToken?.symbol &&
    destinationTokenSymbol
      ? {
          source: `${formatMinimumReceived(sourceAmount)} ${sourceToken.symbol}`,
          destination: destinationTokenSymbol,
          interval:
            parsedEveryValue === 1
              ? strings(`bridge.recurring.unit.${everyUnit}`)
              : `${everyValue} ${strings(
                  `bridge.recurring.unit_plural.${everyUnit}`,
                )}`,
          repetition: strings('bridge.recurring.repeat_summary', {
            count: parsedRepeatCount,
          }),
        }
      : undefined;

  if (!isValidSourceAmount) {
    return null;
  }

  if (
    !isBelowMinAmount &&
    !isInitialQuoteLoading &&
    (!activeQuote || !quotesLastFetched)
  ) {
    return null;
  }

  return (
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      gap={3}
      paddingTop={3}
      paddingLeft={4}
      paddingRight={4}
      twClassName="w-full shrink-0 bg-default"
      style={{ paddingBottom: bottomInset }}
    >
      <SwapsRecurringBuyConfirmButton
        onPress={onPreviewOrder}
        label={label}
        testID={BridgeViewSelectorsIDs.CONFIRM_BUTTON}
        disabled={isBelowMinAmount || isPreviewDisabled}
        loading={isQuoteLoading}
      />
      {!isBelowMinAmount && activeQuote && spendSummaryValues ? (
        <Text
          variant={TextVariant.BodyXs}
          color={TextColor.TextAlternative}
          twClassName="text-center"
          testID={BridgeViewSelectorsIDs.RECURRING_SPEND_SUMMARY}
        >
          {strings('bridge.recurring.spend_summary.swapping')}{' '}
          <Text variant={TextVariant.BodyXs} color={TextColor.TextDefault}>
            {spendSummaryValues.source}
          </Text>{' '}
          {strings('bridge.recurring.spend_summary.for')}{' '}
          <Text variant={TextVariant.BodyXs} color={TextColor.TextDefault}>
            {spendSummaryValues.destination}
          </Text>{' '}
          {strings('bridge.recurring.spend_summary.every')}{' '}
          <Text variant={TextVariant.BodyXs} color={TextColor.TextDefault}>
            {spendSummaryValues.interval}
          </Text>
          {`. ${strings('bridge.recurring.spend_summary.repeats')} `}
          <Text variant={TextVariant.BodyXs} color={TextColor.TextDefault}>
            {spendSummaryValues.repetition}
          </Text>
          .
        </Text>
      ) : null}
    </Box>
  );
};
