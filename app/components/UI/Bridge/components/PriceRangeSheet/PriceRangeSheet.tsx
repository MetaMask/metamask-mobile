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
import { getCurrencySymbol } from '../../utils/currencyUtils';
import {
  applyPercentToPrice,
  DEFAULT_PRICE_RANGE_TOKEN_SIDE,
  formatExchangeRate,
  formatTokenFiatPrice,
  isValidPriceRange,
  PRICE_RANGE_MAX_PERCENTS,
  PRICE_RANGE_MIN_PERCENTS,
  sanitizePriceInput,
  type PriceRangeTokenSide,
} from '../../utils/priceRange';
import { PriceRangeSheetSelectorsIDs } from './PriceRangeSheet.testIds';
import type { PriceRangeSheetProps } from './PriceRangeSheet.types';

function formatPercentLabel(percent: number): string {
  return `${percent > 0 ? '+' : ''}${percent}%`;
}

function PricePercentRow({
  bound,
  percents,
  isDisabled,
  onSelect,
}: {
  bound: 'min' | 'max';
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

const PriceRangeSheet = ({
  isVisible,
  sourceToken,
  destToken,
  sourceFiatRate,
  destFiatRate,
  quoteRate,
  currentCurrency,
  initialTokenSide,
  initialMinFiat,
  initialMaxFiat,
  onClose,
  onConfirm,
}: PriceRangeSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const [pendingTokenSide, setPendingTokenSide] = useState<PriceRangeTokenSide>(
    initialTokenSide ?? DEFAULT_PRICE_RANGE_TOKEN_SIDE,
  );
  const [pendingMin, setPendingMin] = useState(initialMinFiat ?? '');
  const [pendingMax, setPendingMax] = useState(initialMaxFiat ?? '');

  useEffect(() => {
    if (isVisible) {
      setPendingTokenSide(initialTokenSide ?? DEFAULT_PRICE_RANGE_TOKEN_SIDE);
      setPendingMin(initialMinFiat ?? '');
      setPendingMax(initialMaxFiat ?? '');
    }
  }, [initialMaxFiat, initialMinFiat, initialTokenSide, isVisible]);

  const selectedToken = pendingTokenSide === 'source' ? sourceToken : destToken;
  const selectedFiatRate =
    pendingTokenSide === 'source' ? sourceFiatRate : destFiatRate;
  const hasLivePrice =
    selectedFiatRate !== undefined && Number.isFinite(selectedFiatRate);
  const canConfirm = isValidPriceRange(pendingMin, pendingMax);
  const currencySymbol = getCurrencySymbol(currentCurrency);

  const priceLabel = useMemo(
    () =>
      formatTokenFiatPrice(
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
        quoteRate,
      }),
    [destToken?.symbol, pendingTokenSide, quoteRate, sourceToken?.symbol],
  );

  const closeSheet = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleTokenSideChange = useCallback(
    (value: string) => {
      const nextSide = value as PriceRangeTokenSide;
      if (nextSide === pendingTokenSide) {
        return;
      }
      setPendingTokenSide(nextSide);
      setPendingMin('');
      setPendingMax('');
    },
    [pendingTokenSide],
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

  const handleConfirm = useCallback(() => {
    if (!canConfirm) {
      return;
    }
    onConfirm({
      tokenSide: pendingTokenSide,
      minFiat: pendingMin,
      maxFiat: pendingMax,
    });
    closeSheet();
  }, [
    canConfirm,
    closeSheet,
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
      onClose={onClose}
    >
      <BottomSheetHeader
        onClose={closeSheet}
        closeButtonProps={{
          testID: PriceRangeSheetSelectorsIDs.CLOSE_BUTTON,
        }}
      >
        {strings('bridge.recurring.price_range.label')}
      </BottomSheetHeader>
      <ScrollView>
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
            <TextField
              value={pendingMin}
              onChangeText={(text) => setPendingMin(sanitizePriceInput(text))}
              placeholder={strings(
                'bridge.recurring.price_range.min_placeholder',
              )}
              startAccessory={
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                >
                  {currencySymbol}
                </Text>
              }
              inputProps={{
                keyboardType: 'decimal-pad',
                testID: PriceRangeSheetSelectorsIDs.MIN_INPUT,
                accessibilityLabel: strings(
                  'bridge.recurring.price_range.min_placeholder',
                ),
              }}
              twClassName="w-full bg-default border-default"
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
            <TextField
              value={pendingMax}
              onChangeText={(text) => setPendingMax(sanitizePriceInput(text))}
              placeholder={strings(
                'bridge.recurring.price_range.max_placeholder',
              )}
              startAccessory={
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                >
                  {currencySymbol}
                </Text>
              }
              inputProps={{
                keyboardType: 'decimal-pad',
                testID: PriceRangeSheetSelectorsIDs.MAX_INPUT,
                accessibilityLabel: strings(
                  'bridge.recurring.price_range.max_placeholder',
                ),
              }}
              twClassName="w-full bg-default border-default"
            />
          </Box>
        </Box>
      </ScrollView>
      <BottomSheetFooter
        primaryButtonProps={{
          children: strings('bridge.recurring.confirm'),
          onPress: handleConfirm,
          isDisabled: !canConfirm,
          testID: PriceRangeSheetSelectorsIDs.CONFIRM_BUTTON,
        }}
      />
    </BottomSheet>
  );
};

export default PriceRangeSheet;
