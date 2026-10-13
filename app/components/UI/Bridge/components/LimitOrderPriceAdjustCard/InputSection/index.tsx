import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import {
  TextInput,
  TouchableOpacity,
  type TextInputSelectionChangeEvent,
} from 'react-native';
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
import { typography } from '@metamask/design-tokens';
import { InputSectionProps, InputSectionRef } from './types';
import { selectCurrentCurrency } from '../../../../../../selectors/currencyRateController';
import {
  LimitOrderExecutionType,
  LimitOrderPriceComparisonDirection,
} from '../../../constants/limitOrders';
import { strings } from '../../../../../../../locales/i18n';
import { getCurrencySymbol } from '../../../utils/currencyUtils';
import { getSwapsLimitOrderDefaultPriceComparisonDirection } from '../../../utils/limitOrders/getSwapsLimitOrderPriceComparisonDirection';
import { formatAmountWithLocaleSeparators } from '../../../utils/formatAmountWithLocaleSeparators';
import { useAutoSizingFont } from '../../../hooks/useAutoSizingFont';
import { LimitOrderPriceAdjustInputSectionSelectorsIDs } from './testIds';

/**
 * Space between the price field's box and its digits, as a ratio of the font
 * size, for a 1.25 line height in Inter on iOS: the extra leading sits above
 * the digits and the descender space below them.
 */
const AMOUNT_TOP_INSET_RATIO = 0.3;
// Leaves 12px of clear space under the price digits. The 8px row margin is
// partly cancelled by this pull; the rest of the line box stays below the glyphs.
const AMOUNT_BOTTOM_INSET_RATIO = 0.094;

export const InputSection = forwardRef<InputSectionRef, InputSectionProps>(
  (
    {
      executionType,
      quotedSymbol,
      isLimitFiatMode,
      unitSymbol,
      onQuoteUnitPress,
      value,
      onInputPress,
      onDismissKeypad,
      selection,
      onSelectionChange,
      secondaryValue,
      onAmountTypeTogglePress,
      marketComparison,
      priceComparisonDirection,
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
    const comparisonDirection =
      priceComparisonDirection ??
      getSwapsLimitOrderDefaultPriceComparisonDirection(executionType);
    const comparisonLabel =
      comparisonDirection === LimitOrderPriceComparisonDirection.AT_OR_ABOVE
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
    // The unit symbol is a non-editable suffix: it's appended to what is
    // rendered in the input, but it's never part of the editable amount, so
    // the caret is clamped to never move into or past it.
    const numericDisplayValue = displayValue ?? '';
    const maxCaretIndex = numericDisplayValue.length;
    const inputDisplayValue =
      unitSymbol && numericDisplayValue.length > 0
        ? `${numericDisplayValue} ${unitSymbol}`
        : numericDisplayValue;
    const clampedSelection = selection
      ? {
          start: Math.min(selection.start, maxCaretIndex),
          end: Math.min(selection.end, maxCaretIndex),
        }
      : selection;
    const handleInputSelectionChange = useCallback(
      (event: TextInputSelectionChangeEvent) => {
        const { start, end } = event.nativeEvent.selection;
        onSelectionChange?.({
          ...event,
          nativeEvent: {
            ...event.nativeEvent,
            selection: {
              start: Math.min(start, maxCaretIndex),
              end: Math.min(end, maxCaretIndex),
            },
          },
        });
      },
      [maxCaretIndex, onSelectionChange],
    );
    const { fontSize, onContainerLayout } = useAutoSizingFont({
      text: `${inputPrefix ?? ''}${inputDisplayValue || '0'}`,
    });
    // A focused iOS TextInput clips glyphs whose line box is only `fontSize`
    // tall, so the field keeps the full line height. Negative margins cancel
    // the empty space around the digits so the row gaps are measured from the
    // glyphs.
    const amountLineHeight = Math.round(fontSize * 1.25);
    const amountTextStyle = tw.style({
      fontSize,
      lineHeight: amountLineHeight,
      height: amountLineHeight,
      marginTop: -Math.round(fontSize * AMOUNT_TOP_INSET_RATIO),
      marginBottom: -Math.round(fontSize * AMOUNT_BOTTOM_INSET_RATIO),
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
      <Box testID={testID}>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={1}
          marginBottom={3}
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
              'flex-row items-center gap-0.5 rounded-2xl bg-muted px-2 py-0.5',
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
        <Box
          twClassName="w-full min-w-0"
          marginBottom={shouldShowSecondaryRow ? 2 : 3}
          onLayout={onContainerLayout}
        >
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
              value={inputDisplayValue}
              isStateStylesDisabled
              showSoftInputOnFocus={false}
              caretHidden={false}
              autoFocus={false}
              placeholder="0"
              textVariant={TextVariant.BodyMd}
              selection={clampedSelection}
              onSelectionChange={handleInputSelectionChange}
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
            marginBottom={3}
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
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                style={tw.style('flex-row items-center self-start')}
              >
                {secondaryValue ? (
                  <Text
                    testID={
                      LimitOrderPriceAdjustInputSectionSelectorsIDs.SECONDARY_VALUE
                    }
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                    style={{ lineHeight: typography.sBodyMD.fontSize }}
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
                style={{ lineHeight: typography.sBodySM.fontSize }}
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
