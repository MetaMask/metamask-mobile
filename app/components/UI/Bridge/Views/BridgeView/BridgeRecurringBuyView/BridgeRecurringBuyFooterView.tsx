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
import { formatAmountWithLocaleSeparators } from '../../../utils/formatAmountWithLocaleSeparators';
import { parsePositiveInteger } from '../../../utils/recurringSchedule';

interface BridgeRecurringBuyFooterViewProps {
  onPreviewOrder: () => void;
  isPreviewDisabled?: boolean;
}

export const BridgeRecurringBuyFooterView = ({
  onPreviewOrder,
  isPreviewDisabled,
}: BridgeRecurringBuyFooterViewProps) => {
  const { bottom: bottomInset } = useSafeAreaInsets();
  const sourceAmount = useSelector(selectSourceAmount);
  const sourceToken = useSelector(selectSourceToken);
  const everyValue = useSelector(selectRecurringEveryValue);
  const everyUnit = useSelector(selectRecurringEveryUnit);
  const repeatCount = useSelector(selectRecurringRepeatCount);
  const { activeQuote, isLoading, needsNewQuote } = useBridgeQuoteDataContext();
  const { quotesLastFetched } = useSelector(selectBridgeControllerState);

  const isValidSourceAmount =
    sourceAmount !== undefined && sourceAmount !== '.' && sourceToken?.decimals;

  const hasValidEvery = parsePositiveInteger(everyValue) !== undefined;
  const hasValidRepeat = parsePositiveInteger(repeatCount) !== undefined;
  const spendSummary =
    isValidSourceAmount &&
    hasValidEvery &&
    hasValidRepeat &&
    sourceAmount &&
    sourceToken?.symbol
      ? strings('bridge.recurring.spend_summary', {
          amount: formatAmountWithLocaleSeparators(sourceAmount),
          symbol: sourceToken.symbol,
          everyValue,
          unit: strings(
            everyValue === '1'
              ? `bridge.recurring.unit.${everyUnit}`
              : `bridge.recurring.unit_plural.${everyUnit}`,
          ),
          repeatCount,
        })
      : undefined;

  if (isLoading && !activeQuote && !needsNewQuote) {
    return null;
  }

  if (!activeQuote || !isValidSourceAmount || !quotesLastFetched) {
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
        label={strings('bridge.recurring.preview_order')}
        testID={BridgeViewSelectorsIDs.CONFIRM_BUTTON}
        disabled={isPreviewDisabled}
      />
      {spendSummary ? (
        <Text
          variant={TextVariant.BodyXs}
          color={TextColor.TextDefault}
          twClassName="text-center"
          testID={BridgeViewSelectorsIDs.RECURRING_SPEND_SUMMARY}
        >
          {spendSummary}
        </Text>
      ) : null}
    </Box>
  );
};
