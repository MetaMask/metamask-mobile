import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { TextInput, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Input,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { InputSectionProps, InputSectionRef } from './types';
import { selectCurrentCurrency } from '../../../../../../selectors/currencyRateController';
import { LimitOrderExecutionType } from '../../../constants/limitOrders';
import { strings } from '../../../../../../../locales/i18n';
import { getCurrencySymbol } from '../../../utils/currencyUtils';
import { formatAmountWithLocaleSeparators } from '../../../utils/formatAmountWithLocaleSeparators';
import { useAutoSizingFont } from '../../../hooks/useAutoSizingFont';
import { LimitOrderPriceAdjustInputSectionSelectorsIDs } from './testIds';

export const InputSection = forwardRef<InputSectionRef, InputSectionProps>(
  (
    {
      executionType,
      quotedSymbol,
      isLimitFiatMode,
      onQuoteUnitPress,
      value,
      onInputPress,
      onDismissKeypad,
      selection,
      onSelectionChange,
      secondaryValue,
      onAmountTypeTogglePress,
      marketComparison,
      testID = LimitOrderPriceAdjustInputSectionSelectorsIDs.CONTAINER,
    },
    ref,
  ) => {
    const tw = useTailwind();
    const currentCurrency = useSelector(selectCurrentCurrency);
    const inputRef = useRef<TextInput>(null);
    const isSell = executionType === LimitOrderExecutionType.SELL;
    const actionLabel = isSell
      ? strings('bridge.limit.sell_when')
      : strings('bridge.limit.buy_when');
    const comparisonLabel = isSell
      ? strings('bridge.limit.is_at_or_above')
      : strings('bridge.limit.is_at_or_below');
    const quoteUnitLabel = quotedSymbol
      ? strings('bridge.limit.quote_unit', {
          amount: 1,
          symbol: quotedSymbol,
        })
      : strings('bridge.limit.quote_unit_fallback', { amount: 1 });
    const inputPrefix = isLimitFiatMode
      ? getCurrencySymbol(currentCurrency || 'usd')
      : undefined;
    const displayValue =
      value && value !== '0' ? formatAmountWithLocaleSeparators(value) : value;
    const { fontSize, onContainerLayout } = useAutoSizingFont({
      text: `${inputPrefix ?? ''}${displayValue || '0'}`,
    });
    const amountTextStyle = tw.style({
      fontSize,
      lineHeight: fontSize * 1.25,
      height: fontSize * 1.25,
      paddingVertical: 0,
      includeFontPadding: false,
      textAlignVertical: 'center',
    });
    const marketComparisonColor =
      marketComparison?.isNegative === true
        ? TextColor.ErrorDefault
        : marketComparison?.isNegative === false
          ? TextColor.SuccessDefault
          : TextColor.TextAlternative;
    const shouldShowSecondaryRow = Boolean(
      secondaryValue || onAmountTypeTogglePress || marketComparison?.label,
    );

    useImperativeHandle(ref, () => ({
      blur: () => inputRef.current?.blur(),
      focus: () => inputRef.current?.focus(),
      isFocused: () => Boolean(inputRef.current?.isFocused()),
    }));

    return (
      <Box testID={testID} gap={1}>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={1}
          twClassName="flex-wrap"
        >
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            {actionLabel}
          </Text>
          <TouchableOpacity
            testID={LimitOrderPriceAdjustInputSectionSelectorsIDs.QUOTE_UNIT}
            onPress={() => {
              onDismissKeypad?.();
              onQuoteUnitPress?.();
            }}
            disabled={!onQuoteUnitPress}
            style={tw.style(
              'flex-row items-center gap-0.5 rounded-md bg-muted px-2 py-0.5',
            )}
          >
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
            >
              {quoteUnitLabel}
            </Text>
            <Icon
              size={IconSize.Xs}
              color={IconColor.IconDefault}
              name={IconName.SwapVertical}
            />
          </TouchableOpacity>
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            {comparisonLabel}
          </Text>
        </Box>
        <Box twClassName="w-full min-w-0" onLayout={onContainerLayout}>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="min-w-0"
          >
            {inputPrefix ? (
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextDefault}
                style={amountTextStyle}
                twClassName="p-0 leading-none"
              >
                {inputPrefix}
              </Text>
            ) : null}
            <Input
              ref={inputRef}
              testID={LimitOrderPriceAdjustInputSectionSelectorsIDs.INPUT}
              value={displayValue}
              isStateStylesDisabled
              showSoftInputOnFocus={false}
              caretHidden={false}
              autoFocus={false}
              placeholder="0"
              textVariant={TextVariant.BodyMd}
              selection={selection}
              onSelectionChange={onSelectionChange}
              onPressIn={onInputPress}
              onFocus={onInputPress}
              style={amountTextStyle}
              twClassName="min-w-0 flex-1 border-0 bg-transparent p-0"
            />
          </Box>
        </Box>
        {shouldShowSecondaryRow ? (
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={1}
            twClassName="self-start"
          >
            {secondaryValue || onAmountTypeTogglePress ? (
              <TouchableOpacity
                testID={
                  LimitOrderPriceAdjustInputSectionSelectorsIDs.AMOUNT_TYPE_TOGGLE
                }
                onPress={() => {
                  onDismissKeypad?.();
                  onAmountTypeTogglePress?.();
                }}
                disabled={!onAmountTypeTogglePress}
                style={tw.style('flex-row items-center self-start px-1 py-1')}
              >
                {secondaryValue ? (
                  <Text
                    testID={
                      LimitOrderPriceAdjustInputSectionSelectorsIDs.SECONDARY_VALUE
                    }
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                  >
                    ≈ {secondaryValue}
                  </Text>
                ) : null}
                {onAmountTypeTogglePress ? (
                  <Icon
                    name={IconName.SwapVertical}
                    size={IconSize.Sm}
                    color={IconColor.IconAlternative}
                  />
                ) : null}
              </TouchableOpacity>
            ) : null}
            {marketComparison?.label ? (
              <Text
                testID={
                  LimitOrderPriceAdjustInputSectionSelectorsIDs.MARKET_COMPARISON
                }
                variant={TextVariant.BodySm}
                color={marketComparisonColor}
                fontWeight={FontWeight.Medium}
              >
                {marketComparison.label}
              </Text>
            ) : null}
          </Box>
        ) : null}
      </Box>
    );
  },
);
