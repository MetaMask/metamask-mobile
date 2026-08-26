import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonSize,
  ButtonsAlignment,
  FilterButton,
  FontWeight,
  SegmentedControl,
  SegmentedControlSize,
  Text,
  TextColor,
  TextField,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import type { KeypadChangeData } from '../../../../Base/Keypad';
import { getCurrencySymbol } from '../../utils/currencyUtils';
import {
  applyPercentToPrice,
  DEFAULT_PRICE_RANGE_TOKEN_SIDE,
  formatExchangeRate,
  formatTokenPrice,
  isValidPriceRange,
  PRICE_RANGE_MAX_PERCENTS,
  PRICE_RANGE_MIN_PERCENTS,
  tokenPairRateFromFiatRates,
  type PriceRangeTokenSide,
} from '../../utils/priceRange';
import {
  FIAT_INPUT_DECIMALS,
  FIAT_KEYPAD_CURRENCY,
} from '../../utils/sourceAmountInputMode';
import { SwapsKeypad } from '../SwapsKeypad';
import type { SwapsKeypadRef } from '../SwapsKeypad/types';
import { PriceRangeSheetSelectorsIDs } from './PriceRangeSheet.testIds';
import type { PriceRangeSheetProps } from './PriceRangeSheet.types';

type PriceRangeField = 'min' | 'max';

const PRICE_RANGE_KEYPAD_SCROLL_INSET = 360;

function formatPercentLabel(percent: number): string {
  return `${percent > 0 ? '+' : ''}${percent}%`;
}

function PricePercentRow({
  bound,
  percents,
  isDisabled,
  onSelect,
}: {
  bound: PriceRangeField;
  percents: readonly number[];
  isDisabled: boolean;
  onSelect: (percent: number) => void;
}) {
  const tw = useTailwind();

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={2}
      twClassName="w-full"
    >
      {percents.map((percent) => (
        <Pressable
          key={percent}
          accessibilityRole="button"
          disabled={isDisabled}
          onPress={() => onSelect(percent)}
          testID={PriceRangeSheetSelectorsIDs.PERCENT(bound, percent)}
          style={({ pressed }) =>
            tw.style(
              'h-12 min-w-0 flex-1 items-center justify-center rounded-xl bg-muted',
              isDisabled && 'opacity-50',
              pressed && !isDisabled && 'bg-muted-pressed',
            )
          }
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            numberOfLines={1}
          >
            {formatPercentLabel(percent)}
          </Text>
        </Pressable>
      ))}
    </Box>
  );
}

function PriceRangeAmountField({
  value,
  placeholder,
  currencySymbol,
  testID,
  onPress,
}: {
  value: string;
  placeholder: string;
  currencySymbol: string;
  testID: string;
  onPress: () => void;
}) {
  return (
    <TextField
      value={value}
      placeholder={placeholder}
      startAccessory={
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {currencySymbol}
        </Text>
      }
      onFocus={onPress}
      inputProps={{
        showSoftInputOnFocus: false,
        caretHidden: false,
        testID,
        accessibilityLabel: placeholder,
        onPressIn: onPress,
      }}
      twClassName="w-full bg-default border-default"
    />
  );
}

const PriceRangeSheet = ({
  isVisible,
  sourceToken,
  destToken,
  sourceFiatRate,
  destFiatRate,
  currentCurrency,
  initialTokenSide,
  initialMin,
  initialMax,
  onClose,
  onConfirm,
}: PriceRangeSheetProps) => {
  const tw = useTailwind();
  const sheetRef = useRef<BottomSheetRef>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const keypadRef = useRef<SwapsKeypadRef>(null);
  const [pendingTokenSide, setPendingTokenSide] = useState<PriceRangeTokenSide>(
    initialTokenSide ?? DEFAULT_PRICE_RANGE_TOKEN_SIDE,
  );
  const [pendingMin, setPendingMin] = useState(initialMin ?? '');
  const [pendingMax, setPendingMax] = useState(initialMax ?? '');
  const [focusedField, setFocusedField] = useState<PriceRangeField | null>(
    null,
  );

  useEffect(() => {
    if (isVisible) {
      setPendingTokenSide(initialTokenSide ?? DEFAULT_PRICE_RANGE_TOKEN_SIDE);
      setPendingMin(initialMin ?? '');
      setPendingMax(initialMax ?? '');
      setFocusedField(null);
    }
  }, [initialMax, initialMin, initialTokenSide, isVisible]);

  useEffect(() => {
    if (focusedField !== 'max') {
      return;
    }

    const frame = requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    });

    return () => cancelAnimationFrame(frame);
  }, [focusedField]);

  const selectedToken = pendingTokenSide === 'source' ? sourceToken : destToken;
  const selectedFiatRate =
    pendingTokenSide === 'source' ? sourceFiatRate : destFiatRate;
  const hasLivePrice =
    selectedFiatRate !== undefined && Number.isFinite(selectedFiatRate);
  const isClearedRange = pendingMin === '' && pendingMax === '';
  const canConfirm = isClearedRange || isValidPriceRange(pendingMin, pendingMax);
  const currencySymbol = getCurrencySymbol(currentCurrency);
  const isKeypadOpen = focusedField !== null;

  const priceLabel = useMemo(
    () =>
      formatTokenPrice(
        selectedToken?.symbol,
        selectedFiatRate,
        currentCurrency,
      ),
    [currentCurrency, selectedFiatRate, selectedToken?.symbol],
  );
  const exchangeRateLabel = useMemo(
    () =>
      formatExchangeRate({
        selected: pendingTokenSide,
        sourceSymbol: sourceToken?.symbol,
        destSymbol: destToken?.symbol,
        quoteRate: tokenPairRateFromFiatRates(sourceFiatRate, destFiatRate),
      }),
    [
      destFiatRate,
      destToken?.symbol,
      pendingTokenSide,
      sourceFiatRate,
      sourceToken?.symbol,
    ],
  );

  const closeKeypad = useCallback(() => {
    keypadRef.current?.close();
    setFocusedField(null);
  }, []);

  const closeSheet = useCallback(() => {
    closeKeypad();
    sheetRef.current?.onCloseBottomSheet();
  }, [closeKeypad]);

  const handleSheetClosed = useCallback(() => {
    closeKeypad();
    onClose();
  }, [closeKeypad, onClose]);

  const focusField = useCallback((field: PriceRangeField) => {
    setFocusedField(field);
    keypadRef.current?.open();
  }, []);

  const handleTokenSideChange = useCallback(
    (value: string) => {
      const nextSide = value as PriceRangeTokenSide;
      if (nextSide === pendingTokenSide) {
        return;
      }
      closeKeypad();
      setPendingTokenSide(nextSide);
      setPendingMin('');
      setPendingMax('');
    },
    [closeKeypad, pendingTokenSide],
  );

  const handleMinPercentPress = useCallback(
    (percent: number) => {
      if (selectedFiatRate === undefined) {
        return;
      }
      setPendingMin(applyPercentToPrice(selectedFiatRate, percent));
    },
    [selectedFiatRate],
  );

  const handleMaxPercentPress = useCallback(
    (percent: number) => {
      if (selectedFiatRate === undefined) {
        return;
      }
      setPendingMax(applyPercentToPrice(selectedFiatRate, percent));
    },
    [selectedFiatRate],
  );

  const handleKeypadChange = useCallback(
    (data: KeypadChangeData) => {
      if (focusedField === 'max') {
        setPendingMax(data.value);
        return;
      }

      if (focusedField === 'min') {
        setPendingMin(data.value);
      }
    },
    [focusedField],
  );

  const handleClearAll = useCallback(() => {
    setPendingMin('');
    setPendingMax('');
  }, []);

  const handleConfirm = useCallback(() => {
    if (!canConfirm) {
      return;
    }
    onConfirm(
      isValidPriceRange(pendingMin, pendingMax)
        ? {
            tokenSide: pendingTokenSide,
            currency: currentCurrency,
            min: pendingMin,
            max: pendingMax,
          }
        : undefined,
    );
    closeSheet();
  }, [
    canConfirm,
    closeSheet,
    currentCurrency,
    onConfirm,
    pendingMax,
    pendingMin,
    pendingTokenSide,
  ]);

  if (!isVisible) {
    return null;
  }

  return (
    <BottomSheet
      ref={sheetRef}
      testID={PriceRangeSheetSelectorsIDs.SHEET}
      onClose={handleSheetClosed}
    >
      <BottomSheetHeader
        onClose={closeSheet}
        closeButtonProps={{
          testID: PriceRangeSheetSelectorsIDs.CLOSE_BUTTON,
        }}
      >
        {strings('bridge.recurring.price_range.label')}
      </BottomSheetHeader>
      <Box twClassName="relative">
        <ScrollView
          ref={scrollViewRef}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={closeKeypad}
          contentContainerStyle={
            isKeypadOpen
              ? tw.style({ paddingBottom: PRICE_RANGE_KEYPAD_SCROLL_INSET })
              : undefined
          }
        >
          <Box paddingHorizontal={4} paddingTop={1} paddingBottom={3} gap={8}>
            <Box>
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Between}
                twClassName="py-2"
              >
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                >
                  {strings('bridge.recurring.price_range.token')}
                </Text>
                <SegmentedControl
                  value={pendingTokenSide}
                  onChange={handleTokenSideChange}
                  size={SegmentedControlSize.Sm}
                  testID={PriceRangeSheetSelectorsIDs.TOKEN_CONTROL}
                >
                  <FilterButton
                    value="dest"
                    testID={PriceRangeSheetSelectorsIDs.TOKEN_OPTION('dest')}
                  >
                    {destToken?.symbol ?? ''}
                  </FilterButton>
                  <FilterButton
                    value="source"
                    testID={PriceRangeSheetSelectorsIDs.TOKEN_OPTION('source')}
                  >
                    {sourceToken?.symbol ?? ''}
                  </FilterButton>
                </SegmentedControl>
              </Box>
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Between}
                twClassName="py-2"
              >
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                >
                  {strings('bridge.recurring.price_range.price')}
                </Text>
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                  testID={PriceRangeSheetSelectorsIDs.PRICE}
                >
                  {priceLabel}
                </Text>
              </Box>
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Between}
                twClassName="py-2"
              >
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                >
                  {strings('bridge.recurring.price_range.exchange_rate')}
                </Text>
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                  testID={PriceRangeSheetSelectorsIDs.EXCHANGE_RATE}
                >
                  {exchangeRateLabel}
                </Text>
              </Box>
            </Box>

            <Box gap={4}>
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
                {strings('bridge.recurring.price_range.min_token_price', {
                  symbol: selectedToken?.symbol ?? '',
                })}
              </Text>
              <PricePercentRow
                bound="min"
                percents={PRICE_RANGE_MIN_PERCENTS}
                isDisabled={!hasLivePrice}
                onSelect={handleMinPercentPress}
              />
              <PriceRangeAmountField
                value={pendingMin}
                placeholder={strings(
                  'bridge.recurring.price_range.min_placeholder',
                )}
                currencySymbol={currencySymbol}
                testID={PriceRangeSheetSelectorsIDs.MIN_INPUT}
                onPress={() => focusField('min')}
              />
            </Box>

            <Box gap={4}>
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
                {strings('bridge.recurring.price_range.max_token_price', {
                  symbol: selectedToken?.symbol ?? '',
                })}
              </Text>
              <PricePercentRow
                bound="max"
                percents={PRICE_RANGE_MAX_PERCENTS}
                isDisabled={!hasLivePrice}
                onSelect={handleMaxPercentPress}
              />
              <PriceRangeAmountField
                value={pendingMax}
                placeholder={strings(
                  'bridge.recurring.price_range.max_placeholder',
                )}
                currencySymbol={currencySymbol}
                testID={PriceRangeSheetSelectorsIDs.MAX_INPUT}
                onPress={() => focusField('max')}
              />
            </Box>
          </Box>
        </ScrollView>
        {isKeypadOpen ? (
          <Pressable
            accessibilityRole="button"
            testID={PriceRangeSheetSelectorsIDs.KEYPAD_DISMISS}
            onPress={closeKeypad}
            style={tw.style('absolute inset-0')}
          />
        ) : null}
      </Box>
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Vertical}
        twClassName="gap-4"
        secondaryButtonProps={{
          children: strings('bridge.recurring.price_range.clear_all'),
          onPress: handleClearAll,
          isDisabled: !pendingMin && !pendingMax,
          size: ButtonSize.Lg,
          testID: PriceRangeSheetSelectorsIDs.CLEAR_ALL,
        }}
        primaryButtonProps={{
          children: strings('bridge.recurring.confirm'),
          onPress: handleConfirm,
          isDisabled: !canConfirm,
          size: ButtonSize.Lg,
          style: { marginTop: 0 },
          testID: PriceRangeSheetSelectorsIDs.CONFIRM_BUTTON,
        }}
      />
      <SwapsKeypad
        ref={keypadRef}
        value={focusedField === 'max' ? pendingMax : pendingMin}
        currency={FIAT_KEYPAD_CURRENCY}
        decimals={FIAT_INPUT_DECIMALS}
        isInteractable
        onChange={handleKeypadChange}
        onClose={() => setFocusedField(null)}
      />
    </BottomSheet>
  );
};

export default PriceRangeSheet;
