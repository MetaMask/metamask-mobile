import MaskedView from '@react-native-masked-view/masked-view';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import LinearGradient from 'react-native-linear-gradient';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import {
  ImpactMoment,
  playImpact,
  playSelection,
} from '../../../../../util/haptics';
import { strings } from '../../../../../../locales/i18n';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  PERPS_CONSTANTS,
  PERFORMANCE_CONFIG,
  type OrderType,
} from '@metamask/perps-controller';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { usePerpsLiquidationPrice } from '../../hooks/usePerpsLiquidationPrice';
import {
  formatPerpsFiat,
  PRICE_RANGES_UNIVERSAL,
} from '../../utils/formatUtils';
import { usePerpsLivePrices } from '../../hooks';
import { PerpsLeverageBottomSheetSelectorsIDs } from '../../Perps.testIds';
import { getProspectiveExecutionPrice } from '../../utils/orderSizing';
import { LIQUIDATION_DISTANCE_DECIMALS } from '../../constants/perpsConfig';
import {
  calculateLiquidationDistance,
  clampLiquidationDistance,
} from '../../utils/liquidationDistance';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetRef,
  ButtonSize,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  KeyValueRow,
  KeyValueRowVariant,
  SectionDivider,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

interface PerpsLeverageBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onBack?: () => void;
  onConfirmComplete?: () => void;
  presentation?: 'bottomSheet' | 'screen';
  onConfirm: (leverage: number, inputMethod?: 'slider' | 'preset') => void;
  leverage: number;
  minLeverage: number;
  maxLeverage: number;
  currentPrice: number;
  direction: 'long' | 'short';
  asset?: string;
  limitPrice?: string;
  triggerPrice?: string;
  orderType?: OrderType;
  enableConfirmHaptics?: boolean;
}

const LEVERAGE_ITEM_WIDTH = 56;
const LEVERAGE_PICKER_HEIGHT = 48;
const LEVERAGE_PICKER_FADE_WIDTH = 48;
// Matches paddingTop={3} (12px) plus paddingBottom={6} (24px).
const LEVERAGE_PICKER_VERTICAL_PADDING = 36;
const LEVERAGE_PICKER_CONTAINER_HEIGHT =
  LEVERAGE_PICKER_HEIGHT + LEVERAGE_PICKER_VERTICAL_PADDING;

const clampLeverage = (
  value: number,
  minLeverage: number,
  maxLeverage: number,
) => Math.max(minLeverage, Math.min(maxLeverage, Math.round(value)));

const PerpsLeverageBottomSheet: React.FC<PerpsLeverageBottomSheetProps> = ({
  isVisible,
  onClose,
  onBack,
  onConfirmComplete,
  presentation = 'bottomSheet',
  onConfirm,
  leverage: initialLeverage,
  minLeverage,
  maxLeverage,
  currentPrice: initialCurrentPrice,
  direction,
  asset = '',
  limitPrice,
  triggerPrice,
  orderType = 'market',
  enableConfirmHaptics = false,
}) => {
  const tw = useTailwind();
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const pickerRef = useRef<ScrollView>(null);
  const lastPickerIndexRef = useRef<number | null>(null);
  const isProgrammaticScrollRef = useRef(false);
  const inputMethodRef = useRef<'slider' | 'preset'>('slider');
  const [pickerWidth, setPickerWidth] = useState(0);
  const boundedInitialLeverage = clampLeverage(
    initialLeverage,
    minLeverage,
    maxLeverage,
  );
  const [tempLeverage, setTempLeverage] = useState(boundedInitialLeverage);
  const [previewLeverage, setPreviewLeverage] = useState(
    boundedInitialLeverage,
  );
  const [isScrolling, setIsScrolling] = useState(false);

  // Cache last valid liquidation price to avoid skeleton blinking when the
  // price updates passively (market price ticks). The cache is intentionally
  // invalidated when the user changes leverage so that stale data from a
  // previous leverage is never shown alongside the new leverage's percentage.
  const lastValidLiquidationPrice = useRef<number | null>(null);

  // Tracks whether the user actively changed leverage.
  // While true, the cache is bypassed and a loading skeleton is shown until
  // the API returns a fresh liquidation price for the new leverage.
  const [leverageChanged, setLeverageChanged] = useState(false);

  // Records when the user last changed leverage. Used to enforce a minimum
  // skeleton display time so that stale in-flight API calls (which the hook's
  // debounce.cancel() cannot abort) don't prematurely clear the skeleton by
  // setting isCalculating = false before the new calculation completes.
  const leverageChangeTime = useRef<number>(0);

  const currentLivePrice = usePerpsLivePrices({
    symbols: [asset],
    throttleMs: 1000,
  });

  const livePrice = Number.parseFloat(currentLivePrice[asset]?.price);
  const currentPrice =
    Number.isFinite(livePrice) && livePrice > 0
      ? livePrice
      : initialCurrentPrice;

  // Dynamically calculate liquidation price based on tempLeverage
  // Use the prospective execution price for priced placements, else live mid.
  const entryPrice = useMemo(
    () =>
      getProspectiveExecutionPrice({
        orderType,
        limitPrice,
        triggerPrice,
        marketPrice: currentPrice,
      }),
    [orderType, limitPrice, triggerPrice, currentPrice],
  );

  // Always use tempLeverage for precise API calls (debounced)
  const { liquidationPrice: apiLiquidationPrice, isCalculating } =
    usePerpsLiquidationPrice(
      {
        entryPrice,
        leverage: tempLeverage, // Final leverage value for API calls
        direction,
        asset,
      },
      {
        debounceMs: PERFORMANCE_CONFIG.LiquidationPriceDebounceMs, // Debounced for performance
      },
    );

  const dynamicLiquidationPrice = Number.parseFloat(apiLiquidationPrice);

  // Cache last valid liquidation price so the UI always shows a value
  // instead of blinking a skeleton loader during passive price updates.
  // Guard: don't cache while leverageChanged is true — the hook's state may
  // contain a stale price from a previous leverage's in-flight API call.
  useEffect(() => {
    if (
      !Number.isNaN(dynamicLiquidationPrice) &&
      dynamicLiquidationPrice > 0 &&
      !leverageChanged
    ) {
      lastValidLiquidationPrice.current = dynamicLiquidationPrice;
    }
  }, [dynamicLiquidationPrice, leverageChanged]);

  // Clear leverageChanged when the hook is done calculating, but enforce a
  // minimum display time after user-initiated leverage changes.
  useEffect(() => {
    if (!leverageChanged) return;

    if (isCalculating) {
      return;
    }

    const elapsed = Date.now() - leverageChangeTime.current;
    const minSkeletonMs = PERFORMANCE_CONFIG.LiquidationPriceDebounceMs + 200;

    if (leverageChangeTime.current > 0 && elapsed < minSkeletonMs) {
      const remaining = minSkeletonMs - elapsed;
      const timer = setTimeout(() => {
        setLeverageChanged(false);
      }, remaining);
      return () => clearTimeout(timer);
    }

    setLeverageChanged(false);
  }, [isCalculating, leverageChanged]);

  useEffect(() => {
    if (!isVisible) {
      setTempLeverage(boundedInitialLeverage);
      setPreviewLeverage(boundedInitialLeverage);
      setIsScrolling(false);
      setLeverageChanged(false);
      // The picker unmounts while hidden, so its measured width must be
      // discarded too. Keeping it would leave the centering effect below with
      // unchanged dependencies on reopen, and the re-measure via onLayout
      // reports the same width — so the picker would never scroll back to the
      // selected leverage.
      setPickerWidth(0);
      lastPickerIndexRef.current = null;
      isProgrammaticScrollRef.current = false;
      inputMethodRef.current = 'slider';
      lastValidLiquidationPrice.current = null;
      leverageChangeTime.current = 0;
    }
  }, [boundedInitialLeverage, isVisible]);

  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
    conditions: [isVisible],
    resetConditions: [!isVisible],
    properties: {
      [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
        PERPS_EVENT_VALUE.SCREEN_TYPE.LEVERAGE,
      [PERPS_EVENT_PROPERTY.ASSET]: asset,
      [PERPS_EVENT_PROPERTY.DIRECTION]:
        direction === 'long'
          ? PERPS_EVENT_VALUE.DIRECTION.LONG
          : PERPS_EVENT_VALUE.DIRECTION.SHORT,
      [PERPS_EVENT_PROPERTY.SOURCE]: PERPS_EVENT_VALUE.SOURCE.TRADE_SCREEN,
    },
  });

  const liquidationDropPercentage = useMemo(() => {
    if (currentPrice === 0 || !currentPrice) return 0;

    if (tempLeverage === 1) {
      return 100;
    }

    if (!dynamicLiquidationPrice || dynamicLiquidationPrice === 0) {
      return clampLiquidationDistance((1 / tempLeverage) * 100);
    }

    return clampLiquidationDistance(
      calculateLiquidationDistance(currentPrice, dynamicLiquidationPrice),
    );
  }, [currentPrice, dynamicLiquidationPrice, tempLeverage]);

  const isRecalculating = leverageChanged;

  const hasValidApiPrice =
    !Number.isNaN(dynamicLiquidationPrice) && dynamicLiquidationPrice > 0;

  const displayLiquidationPrice = isRecalculating
    ? null
    : hasValidApiPrice
      ? dynamicLiquidationPrice
      : lastValidLiquidationPrice.current;

  const displayLiquidationPercentage = isRecalculating
    ? null
    : `${liquidationDropPercentage.toFixed(LIQUIDATION_DISTANCE_DECIMALS)}%`;

  const leverageOptions = useMemo(
    () =>
      Array.from(
        { length: Math.max(0, maxLeverage - minLeverage + 1) },
        (_, index) => minLeverage + index,
      ),
    [maxLeverage, minLeverage],
  );

  const displayLeverage = isScrolling ? previewLeverage : tempLeverage;

  const getLeverageForOffset = useCallback(
    (offset: number) =>
      clampLeverage(
        minLeverage + Math.round(offset / LEVERAGE_ITEM_WIDTH),
        minLeverage,
        maxLeverage,
      ),
    [maxLeverage, minLeverage],
  );

  const commitLeverage = useCallback(
    (value: number) => {
      const boundedValue = clampLeverage(value, minLeverage, maxLeverage);
      setIsScrolling(false);
      setPreviewLeverage(boundedValue);
      if (boundedValue !== tempLeverage) {
        leverageChangeTime.current = Date.now();
        setLeverageChanged(true);
        lastValidLiquidationPrice.current = null;
      }
      setTempLeverage(boundedValue);
    },
    [maxLeverage, minLeverage, tempLeverage],
  );

  const handlePickerLayout = useCallback((event: LayoutChangeEvent) => {
    setPickerWidth(event.nativeEvent.layout.width);
    lastPickerIndexRef.current = null;
  }, []);

  useEffect(() => {
    if (!isVisible || pickerWidth === 0) {
      return;
    }
    const index = Math.max(0, leverageOptions.indexOf(tempLeverage));
    if (lastPickerIndexRef.current === index) {
      return;
    }
    lastPickerIndexRef.current = index;
    isProgrammaticScrollRef.current = true;
    pickerRef.current?.scrollTo({
      x: index * LEVERAGE_ITEM_WIDTH,
      animated: false,
    });
  }, [isVisible, leverageOptions, pickerWidth, tempLeverage]);

  const handlePickerScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (isProgrammaticScrollRef.current) {
        return;
      }

      const nextLeverage = getLeverageForOffset(
        event.nativeEvent.contentOffset.x,
      );
      if (nextLeverage !== previewLeverage) {
        setPreviewLeverage(nextLeverage);
        playImpact(ImpactMoment.SliderTick);
      }
    },
    [getLeverageForOffset, previewLeverage],
  );

  const handlePickerScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      isProgrammaticScrollRef.current = false;
      const offset =
        event.nativeEvent.targetContentOffset?.x ??
        event.nativeEvent.contentOffset.x;
      const leverageValue = getLeverageForOffset(offset);
      lastPickerIndexRef.current = leverageValue - minLeverage;
      commitLeverage(leverageValue);
    },
    [commitLeverage, getLeverageForOffset, minLeverage],
  );

  const handlePickerScrollEndDrag = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (Math.abs(event.nativeEvent.velocity?.x ?? 0) < 0.01) {
        handlePickerScrollEnd(event);
      }
    },
    [handlePickerScrollEnd],
  );

  const handlePickerScrollBeginDrag = useCallback(() => {
    isProgrammaticScrollRef.current = false;
    inputMethodRef.current = 'slider';
    setIsScrolling(true);
  }, []);

  const handleLeveragePress = useCallback(
    (value: number) => {
      const index = value - minLeverage;
      lastPickerIndexRef.current = index;
      isProgrammaticScrollRef.current = true;
      inputMethodRef.current = 'preset';
      pickerRef.current?.scrollTo({
        x: index * LEVERAGE_ITEM_WIDTH,
        animated: true,
      });
      commitLeverage(value);
      playSelection();
    },
    [commitLeverage, minLeverage],
  );

  const handleConfirm = useCallback(() => {
    const leverageToConfirm = isScrolling ? previewLeverage : tempLeverage;
    const inputMethod = inputMethodRef.current;

    DevLogger.log(
      `Confirming leverage: ${leverageToConfirm}, method: ${inputMethod}`,
    );

    if (enableConfirmHaptics) {
      playSelection().catch(() => undefined);
    }
    onConfirm(leverageToConfirm, inputMethod);
    (onConfirmComplete ?? onClose)();
  }, [
    enableConfirmHaptics,
    isScrolling,
    onClose,
    onConfirmComplete,
    onConfirm,
    previewLeverage,
    tempLeverage,
  ]);

  const fadeMask = (
    <Box
      flexDirection={BoxFlexDirection.Row}
      twClassName="flex-1"
      accessible={false}
    >
      <LinearGradient
        colors={['transparent', 'black']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={tw.style(`w-[${LEVERAGE_PICKER_FADE_WIDTH}px]`)}
      />
      <Box twClassName="flex-1 bg-black" />
      <LinearGradient
        colors={['black', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={tw.style(`w-[${LEVERAGE_PICKER_FADE_WIDTH}px]`)}
      />
    </Box>
  );

  if (!isVisible) return null;

  const content = (
    <>
      <BottomSheetHeader
        onBack={presentation === 'screen' ? onBack : undefined}
        onClose={onClose}
      >
        {strings('perps.order.leverage_modal.title')}
      </BottomSheetHeader>

      <Box paddingTop={3} accessible={false}>
        {currentPrice ? (
          <Box paddingHorizontal={4} accessible={false}>
            <KeyValueRow
              variant={KeyValueRowVariant.Summary}
              keyLabel={strings('perps.order.leverage_modal.current_price')}
              value={formatPerpsFiat(currentPrice, {
                ranges: PRICE_RANGES_UNIVERSAL,
              })}
              valueTextProps={{
                testID:
                  PerpsLeverageBottomSheetSelectorsIDs.CURRENT_PRICE_VALUE,
              }}
            />
            <KeyValueRow
              variant={KeyValueRowVariant.Summary}
              keyLabel={strings('perps.order.leverage_modal.liquidation_price')}
              value={
                isRecalculating ? (
                  <Skeleton
                    width={112}
                    height={16}
                    testID={
                      PerpsLeverageBottomSheetSelectorsIDs.LIQUIDATION_PRICE_SKELETON
                    }
                  />
                ) : (
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Center}
                    accessible={false}
                  >
                    <Text
                      variant={TextVariant.BodyMd}
                      fontWeight={FontWeight.Medium}
                      color={TextColor.TextDefault}
                      testID={
                        PerpsLeverageBottomSheetSelectorsIDs.LIQUIDATION_PRICE_VALUE
                      }
                    >
                      {displayLiquidationPrice
                        ? formatPerpsFiat(displayLiquidationPrice, {
                            ranges: PRICE_RANGES_UNIVERSAL,
                          })
                        : PERPS_CONSTANTS.FallbackDataDisplay}
                    </Text>
                    {(tempLeverage === 1 || displayLiquidationPrice !== null) &&
                      displayLiquidationPercentage && (
                        <>
                          <Text
                            variant={TextVariant.BodyMd}
                            color={TextColor.TextAlternative}
                            testID={
                              PerpsLeverageBottomSheetSelectorsIDs.LIQUIDATION_DISTANCE_VALUE
                            }
                          >
                            {` ${displayLiquidationPercentage}`}
                          </Text>
                          <Icon
                            name={
                              direction === 'long'
                                ? IconName.TrendDown
                                : IconName.TrendUp
                            }
                            size={IconSize.Sm}
                            color={IconColor.IconAlternative}
                            testID={
                              PerpsLeverageBottomSheetSelectorsIDs.LIQUIDATION_TREND_ICON
                            }
                          />
                        </>
                      )}
                  </Box>
                )
              }
            />
          </Box>
        ) : (
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="text-center px-4 py-4"
          >
            {strings('perps.order.leverage_modal.price_unavailable')}
          </Text>
        )}

        <SectionDivider />

        <Box
          paddingTop={3}
          paddingBottom={6}
          twClassName={`h-[${LEVERAGE_PICKER_CONTAINER_HEIGHT}px]`}
          accessible={false}
        >
          <MaskedView
            style={tw.style('flex-1 overflow-hidden')}
            maskElement={fadeMask}
          >
            <ScrollView
              ref={pickerRef}
              horizontal
              bounces={false}
              directionalLockEnabled
              showsHorizontalScrollIndicator={false}
              snapToAlignment="start"
              snapToInterval={LEVERAGE_ITEM_WIDTH}
              decelerationRate="fast"
              scrollEventThrottle={16}
              contentContainerStyle={tw.style('items-center', {
                paddingHorizontal: Math.max(
                  (pickerWidth - LEVERAGE_ITEM_WIDTH) / 2,
                  0,
                ),
              })}
              testID={PerpsLeverageBottomSheetSelectorsIDs.PICKER}
              onLayout={handlePickerLayout}
              onScrollBeginDrag={handlePickerScrollBeginDrag}
              onScroll={handlePickerScroll}
              onScrollEndDrag={handlePickerScrollEndDrag}
              onMomentumScrollEnd={handlePickerScrollEnd}
            >
              {leverageOptions.map((value) => {
                const distance = Math.abs(value - displayLeverage);
                const isSelected = distance === 0;
                const textVariant = isSelected
                  ? TextVariant.HeadingLg
                  : distance === 1
                    ? TextVariant.BodyMd
                    : TextVariant.BodySm;
                const textColor =
                  distance <= 1
                    ? TextColor.TextAlternative
                    : TextColor.TextMuted;

                return (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityLabel={`${value}x`}
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => handleLeveragePress(value)}
                    testID={`${PerpsLeverageBottomSheetSelectorsIDs.PICKER_ITEM}-${value}`}
                    style={({ pressed }) =>
                      tw.style(
                        'h-10 items-center justify-center rounded-lg',
                        isSelected && 'bg-muted',
                        pressed && 'opacity-70',
                        { width: LEVERAGE_ITEM_WIDTH },
                      )
                    }
                  >
                    <Text
                      variant={textVariant}
                      fontWeight={FontWeight.Medium}
                      color={isSelected ? TextColor.TextDefault : textColor}
                    >
                      {value}x
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </MaskedView>
        </Box>
      </Box>

      <BottomSheetFooter
        primaryButtonProps={{
          size: ButtonSize.Lg,
          onPress: handleConfirm,
          children: strings('perps.order.leverage_modal.set'),
          testID: PerpsLeverageBottomSheetSelectorsIDs.SET_BUTTON,
          twClassName: 'mb-4',
        }}
      />
    </>
  );

  if (presentation === 'screen') {
    return <Box twClassName="flex-1">{content}</Box>;
  }

  return (
    <BottomSheet ref={bottomSheetRef} onClose={onClose}>
      {content}
    </BottomSheet>
  );
};

PerpsLeverageBottomSheet.displayName = 'PerpsLeverageBottomSheet';

export default PerpsLeverageBottomSheet;
