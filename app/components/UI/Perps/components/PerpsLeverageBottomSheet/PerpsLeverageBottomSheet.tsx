import {
  playImpact,
  playSelection,
  ImpactMoment,
} from '../../../../../util/haptics';
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ScrollView } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  PERFORMANCE_CONFIG,
  type OrderType,
} from '@metamask/perps-controller';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { usePerpsLiquidationPrice } from '../../hooks/usePerpsLiquidationPrice';
import {
  formatPerpsFiat,
  PRICE_RANGES_UNIVERSAL,
} from '../../utils/formatUtils';
import { createStyles } from './PerpsLeverageBottomSheet.styles';
import { usePerpsLivePrices } from '../../hooks';
import { PerpsLeverageBottomSheetSelectorsIDs } from '../../Perps.testIds';
import {
  Box,
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetRef,
  Button,
  ButtonSize,
  ButtonVariant,
  HelpText,
  KeyValueRow,
  KeyValueRowVariant,
  Skeleton,
  Slider,
  SliderMarkColor,
  Text,
  TextColor,
  TextVariant,
  type SliderMark,
} from '@metamask/design-system-react-native';

interface PerpsLeverageBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: (leverage: number, inputMethod?: 'slider' | 'preset') => void;
  leverage: number;
  minLeverage: number;
  maxLeverage: number;
  currentPrice: number;
  direction: 'long' | 'short';
  asset?: string;
  limitPrice?: string;
  orderType?: OrderType;
}

interface LeverageSliderEntry {
  key: number;
  value: number;
  role: 'active' | 'incoming';
}

const leverageToTrackStep = (
  value: number,
  minLeverage: number,
  maxLeverage: number,
): number => {
  if (maxLeverage === minLeverage) {
    return 0;
  }
  return ((value - minLeverage) / (maxLeverage - minLeverage)) * 100;
};

const PerpsLeverageBottomSheet: React.FC<PerpsLeverageBottomSheetProps> = ({
  isVisible,
  onClose,
  onConfirm,
  leverage: initialLeverage,
  minLeverage,
  maxLeverage,
  direction,
  asset = '',
  limitPrice,
  orderType = 'market',
}) => {
  const styles = createStyles();
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const [tempLeverage, setTempLeverage] = useState(initialLeverage);
  const [draggingLeverage, setDraggingLeverage] = useState(initialLeverage);
  const [isDragging, setIsDragging] = useState(false);
  const [inputMethod, setInputMethod] = useState<'slider' | 'preset'>('slider');
  // After a slider gesture, MMDS can leave drag/echo state stuck so chip
  // prop updates won't move the thumb. Remount via a hidden "incoming"
  // instance, then promote it in place (same React key) so the old thumb
  // stays visible until the new one is laid out — no opacity flash, no
  // translateX=0 jerk.
  const [sliderEntries, setSliderEntries] = useState<LeverageSliderEntry[]>([
    { key: 0, value: initialLeverage, role: 'active' },
  ]);
  const hasSliderDraggedRef = useRef(false);
  const promoteFrameRef = useRef<number | null>(null);
  // While an incoming slider is mounting after a preset chip, ignore late
  // drag events from the outgoing active instance so tempLeverage cannot
  // desync from the chip value that will be promoted.
  const isSliderRemountingRef = useRef(false);

  // Cache last valid liquidation price to avoid skeleton blinking when the
  // price updates passively (market price ticks). The cache is intentionally
  // invalidated when the user changes leverage so that stale data from a
  // previous leverage is never shown alongside the new leverage's percentage.
  const lastValidLiquidationPrice = useRef<number | null>(null);

  // Tracks whether the user actively changed leverage (slider/quick select).
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

  const currentPrice = parseFloat(currentLivePrice[asset]?.price);

  // Dynamically calculate liquidation price based on tempLeverage
  // Use limit price for limit orders, market price for market orders
  const entryPrice = useMemo(
    () =>
      orderType === 'limit' && limitPrice
        ? Number.parseFloat(limitPrice)
        : currentPrice,
    [orderType, limitPrice, currentPrice],
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
      setTempLeverage(initialLeverage);
      setDraggingLeverage(initialLeverage);
      setIsDragging(false);
      setLeverageChanged(false);
      setSliderEntries([{ key: 0, value: initialLeverage, role: 'active' }]);
      hasSliderDraggedRef.current = false;
      isSliderRemountingRef.current = false;
      if (promoteFrameRef.current !== null) {
        cancelAnimationFrame(promoteFrameRef.current);
        promoteFrameRef.current = null;
      }
      lastValidLiquidationPrice.current = null;
      leverageChangeTime.current = 0;
    }
  }, [isVisible, initialLeverage]);

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
    const leverageToUse = isDragging ? draggingLeverage : tempLeverage;

    if (currentPrice === 0 || !currentPrice) return 0;

    if (leverageToUse === 1) {
      return 100;
    }

    if (!dynamicLiquidationPrice || dynamicLiquidationPrice === 0) {
      const theoreticalPercentage = (1 / leverageToUse) * 100;
      return theoreticalPercentage >= 99.9 ? 100 : theoreticalPercentage;
    }

    const percentageDrop =
      (Math.abs(currentPrice - dynamicLiquidationPrice) / currentPrice) * 100;

    return percentageDrop >= 99.9 ? 100 : percentageDrop;
  }, [
    currentPrice,
    dynamicLiquidationPrice,
    tempLeverage,
    isDragging,
    draggingLeverage,
  ]);

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
    : `${liquidationDropPercentage.toFixed(1)}%`;

  const quickSelectValues = useMemo(() => {
    DevLogger.log(
      `Generating leverage options for maxLeverage: ${maxLeverage}`,
    );
    const baseOptions = [2, 5, 10, 20, 40];
    const filtered = baseOptions.filter((option) => option <= maxLeverage);
    const options = maxLeverage === 3 ? [2, 3] : filtered;

    DevLogger.log(`Available leverage options: ${options.join(', ')}`);
    return options;
  }, [maxLeverage]);

  const midLeverage =
    maxLeverage >= 40 ? 20 : Math.floor((minLeverage + maxLeverage) / 2);

  const sliderMarks = useMemo((): SliderMark[] => {
    const toStep = (value: number) =>
      leverageToTrackStep(value, minLeverage, maxLeverage);

    const marks: SliderMark[] = [
      {
        step: toStep(minLeverage),
        label: `${minLeverage}x`,
        value: minLeverage,
        color: SliderMarkColor.SuccessDefault,
      },
    ];

    if (midLeverage > minLeverage && midLeverage < maxLeverage) {
      marks.push({
        step: toStep(midLeverage),
        label: `${midLeverage}x`,
        value: midLeverage,
        color: SliderMarkColor.WarningDefault,
      });
    }

    if (maxLeverage !== minLeverage) {
      marks.push({
        step: toStep(maxLeverage),
        label: `${maxLeverage}x`,
        value: maxLeverage,
        color: SliderMarkColor.ErrorDefault,
      });
    }

    return marks;
  }, [minLeverage, maxLeverage, midLeverage]);

  const displayLeverage = isDragging ? draggingLeverage : tempLeverage;
  const hasIncomingSlider = sliderEntries.some(
    (entry) => entry.role === 'incoming',
  );

  const syncActiveSliderValue = useCallback((value: number) => {
    setSliderEntries((prev) =>
      prev.map((entry) =>
        entry.role === 'active' ? { ...entry, value } : entry,
      ),
    );
  }, []);

  const handleSliderChange = useCallback((value: number) => {
    if (isSliderRemountingRef.current) {
      return;
    }
    hasSliderDraggedRef.current = true;
    setIsDragging(true);
    setDraggingLeverage(value);
  }, []);

  const handleSliderDragEnd = useCallback(
    (value: number) => {
      if (isSliderRemountingRef.current) {
        return;
      }
      setIsDragging(false);
      if (value !== tempLeverage) {
        leverageChangeTime.current = Date.now();
        setLeverageChanged(true);
        lastValidLiquidationPrice.current = null;
      }
      setTempLeverage(value);
      syncActiveSliderValue(value);
      setInputMethod('slider');
    },
    [syncActiveSliderValue, tempLeverage],
  );

  // ScrollView / gesture arbitration can finalize the MMDS pan without
  // onDragEnd; mirror drag-end so liquidation UI refreshes for the settled value.
  const handleSliderDragCancel = useCallback(() => {
    if (isSliderRemountingRef.current) {
      return;
    }
    if (isDragging) {
      setIsDragging(false);
      if (draggingLeverage !== tempLeverage) {
        leverageChangeTime.current = Date.now();
        setLeverageChanged(true);
        lastValidLiquidationPrice.current = null;
      }
      setTempLeverage(draggingLeverage);
      syncActiveSliderValue(draggingLeverage);
      setInputMethod('slider');
    }
  }, [draggingLeverage, isDragging, syncActiveSliderValue, tempLeverage]);

  const handleConfirm = useCallback(() => {
    // Guard against confirming a stale committed `tempLeverage` while
    // `isDragging` is (or is stuck) true — e.g. a cancelled gesture
    // that never reached handleSliderDragEnd (see handleSliderDragCancel
    // above). Flush the last live value and bail; `tempLeverage`
    // reflects it on the next render, so the very next tap confirms the
    // leverage shown on the numeral/footer instead of racing a same-tick
    // confirm against a state update.
    if (isDragging) {
      handleSliderDragCancel();
      return;
    }

    DevLogger.log(
      `Confirming leverage: ${tempLeverage}, method: ${inputMethod}`,
    );

    playSelection();
    onConfirm(tempLeverage, inputMethod);
    onClose();
  }, [
    handleSliderDragCancel,
    inputMethod,
    isDragging,
    onClose,
    onConfirm,
    tempLeverage,
  ]);

  const handleSliderGrip = useCallback(() => {
    playImpact(ImpactMoment.SliderGrip);
  }, []);

  const handleSliderMark = useCallback(() => {
    playImpact(ImpactMoment.SliderTick);
  }, []);

  const promoteIncomingSlider = useCallback((incomingKey: number) => {
    if (promoteFrameRef.current !== null) {
      cancelAnimationFrame(promoteFrameRef.current);
    }
    // Wait until the incoming Slider has applied its layout-driven thumb
    // position, then promote that same instance (same key) to active.
    promoteFrameRef.current = requestAnimationFrame(() => {
      promoteFrameRef.current = requestAnimationFrame(() => {
        promoteFrameRef.current = null;
        setSliderEntries((prev) => {
          const incoming = prev.find((entry) => entry.key === incomingKey);
          if (!incoming) {
            return prev;
          }
          return [{ key: incoming.key, value: incoming.value, role: 'active' }];
        });
        isSliderRemountingRef.current = false;
      });
    });
  }, []);

  const handleQuickSelect = useCallback(
    (value: number) => {
      // A second chip during the promote window must cancel the pending
      // promote and remount again; otherwise the first chip's incoming value
      // is restored after the sync-only path updates tempLeverage.
      if (promoteFrameRef.current !== null) {
        cancelAnimationFrame(promoteFrameRef.current);
        promoteFrameRef.current = null;
      }

      const wasDragging = isDragging;
      setIsDragging(false);
      if (value !== tempLeverage) {
        leverageChangeTime.current = Date.now();
        setLeverageChanged(true);
        lastValidLiquidationPrice.current = null;
      }
      setTempLeverage(value);
      setDraggingLeverage(value);
      setInputMethod('preset');

      // Arm the guard before the remount state flush so any late drag
      // callbacks queued in this tick cannot overwrite tempLeverage.
      if (wasDragging || hasSliderDraggedRef.current) {
        isSliderRemountingRef.current = true;
      }

      setSliderEntries((prev) => {
        const hasIncoming = prev.some((entry) => entry.role === 'incoming');
        const shouldRemountSlider =
          wasDragging || hasSliderDraggedRef.current || hasIncoming;

        if (!shouldRemountSlider) {
          isSliderRemountingRef.current = false;
          return prev.map((entry) =>
            entry.role === 'active' ? { ...entry, value } : entry,
          );
        }

        isSliderRemountingRef.current = true;
        hasSliderDraggedRef.current = false;
        const active = prev.find((entry) => entry.role === 'active') ?? prev[0];
        const nextKey = Math.max(...prev.map((entry) => entry.key)) + 1;
        return [
          { key: active.key, value: active.value, role: 'active' },
          { key: nextKey, value, role: 'incoming' },
        ];
      });

      playSelection();
    },
    [isDragging, tempLeverage],
  );

  if (!isVisible) return null;

  return (
    <BottomSheet ref={bottomSheetRef} onClose={onClose}>
      <BottomSheetHeader onClose={onClose}>
        {strings('perps.order.leverage_modal.title')}
      </BottomSheetHeader>

      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Box twClassName="pb-4">
          <Box twClassName="items-center px-4 py-4">
            <Text variant={TextVariant.DisplayLg} color={TextColor.TextDefault}>
              {displayLeverage}x
            </Text>
          </Box>

          <Box
            twClassName="relative px-4"
            onTouchCancel={handleSliderDragCancel}
          >
            {sliderEntries.map((entry) => {
              const isActive = entry.role === 'active';
              // Outgoing active slider must not accept input during remount;
              // late dragEnd would overwrite the chip's tempLeverage.
              const acceptsInput = isActive && !hasIncomingSlider;
              const sliderValue =
                acceptsInput && isDragging ? draggingLeverage : entry.value;

              return (
                <Box
                  key={entry.key}
                  testID={
                    isActive
                      ? undefined
                      : PerpsLeverageBottomSheetSelectorsIDs.SLIDER_INCOMING_WRAP
                  }
                  style={isActive ? undefined : styles.sliderIncoming}
                  pointerEvents={acceptsInput ? 'auto' : 'none'}
                  onLayout={
                    isActive
                      ? undefined
                      : () => {
                          promoteIncomingSlider(entry.key);
                        }
                  }
                >
                  <Slider
                    testID={
                      isActive
                        ? PerpsLeverageBottomSheetSelectorsIDs.SLIDER
                        : PerpsLeverageBottomSheetSelectorsIDs.SLIDER_INCOMING
                    }
                    value={sliderValue}
                    onValueChange={
                      acceptsInput ? handleSliderChange : () => undefined
                    }
                    onDragEnd={acceptsInput ? handleSliderDragEnd : undefined}
                    minimumValue={minLeverage}
                    maximumValue={maxLeverage}
                    step={1}
                    marks={sliderMarks}
                    showRangeLabels
                    showRangeDots
                    onGrip={acceptsInput ? handleSliderGrip : undefined}
                    onMark={acceptsInput ? handleSliderMark : undefined}
                  />
                </Box>
              );
            })}
          </Box>

          <Box twClassName="flex-row justify-between gap-2 px-4 mt-1 mb-4">
            {quickSelectValues.map((value) => (
              <Button
                key={value}
                variant={ButtonVariant.Secondary}
                size={ButtonSize.Md}
                onPress={() => handleQuickSelect(value)}
                testID={`${PerpsLeverageBottomSheetSelectorsIDs.QUICK_SELECT}-${value}`}
                twClassName="flex-1"
              >
                {`${value}x`}
              </Button>
            ))}
          </Box>

          <Box
            twClassName="items-center justify-center px-4 mb-4"
            style={styles.helpTextContainer}
          >
            {isRecalculating ? (
              <Skeleton width="80%" height={14} />
            ) : (
              <HelpText
                testID={PerpsLeverageBottomSheetSelectorsIDs.HELP_TEXT}
                twClassName="w-full justify-center text-center"
              >
                {strings('perps.order.leverage_modal.liquidation_warning', {
                  direction:
                    direction === 'long'
                      ? strings('perps.order.leverage_modal.drops')
                      : strings('perps.order.leverage_modal.rises'),
                  percentage: displayLiquidationPercentage ?? '--',
                })}
              </HelpText>
            )}
          </Box>

          {currentPrice ? (
            <Box
              twClassName="mb-2 justify-center"
              style={styles.priceInfoContainer}
            >
              <KeyValueRow
                variant={KeyValueRowVariant.Summary}
                keyLabel={strings(
                  'perps.order.leverage_modal.liquidation_price',
                )}
                value={
                  isRecalculating ? (
                    <Skeleton width={80} height={16} />
                  ) : displayLiquidationPrice ? (
                    formatPerpsFiat(displayLiquidationPrice, {
                      ranges: PRICE_RANGES_UNIVERSAL,
                    })
                  ) : (
                    '--'
                  )
                }
              />
              <KeyValueRow
                variant={KeyValueRowVariant.Summary}
                keyLabel={strings('perps.order.leverage_modal.current_price')}
                value={formatPerpsFiat(currentPrice, {
                  ranges: PRICE_RANGES_UNIVERSAL,
                })}
              />
            </Box>
          ) : (
            <Box
              twClassName="mb-2 justify-center"
              style={styles.priceInfoContainer}
            >
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
                twClassName="text-center px-4 py-4"
              >
                {strings('perps.order.leverage_modal.price_unavailable')}
              </Text>
            </Box>
          )}
        </Box>
      </ScrollView>

      <BottomSheetFooter
        primaryButtonProps={{
          size: ButtonSize.Lg,
          onPress: handleConfirm,
          children: strings('perps.order.leverage_modal.set_leverage', {
            leverage: displayLeverage,
          }),
          twClassName: 'mb-4',
        }}
      />
    </BottomSheet>
  );
};

PerpsLeverageBottomSheet.displayName = 'PerpsLeverageBottomSheet';

export default memo(
  PerpsLeverageBottomSheet,
  (prevProps, nextProps) =>
    prevProps.isVisible === nextProps.isVisible &&
    prevProps.leverage === nextProps.leverage &&
    prevProps.minLeverage === nextProps.minLeverage &&
    prevProps.maxLeverage === nextProps.maxLeverage &&
    prevProps.direction === nextProps.direction,
);
