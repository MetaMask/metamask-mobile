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
import { ScrollView, View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import { useTheme } from '../../../../../util/theme';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  PERFORMANCE_CONFIG,
} from '@metamask/perps-controller';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { usePerpsLiquidationPrice } from '../../hooks/usePerpsLiquidationPrice';
import {
  formatPerpsFiat,
  PRICE_RANGES_UNIVERSAL,
} from '../../utils/formatUtils';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import { createStyles } from './PerpsLeverageBottomSheet.styles';
import { usePerpsLivePrices } from '../../hooks';
import {
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
  orderType?: 'market' | 'limit';
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
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const [tempLeverage, setTempLeverage] = useState(initialLeverage);
  const [draggingLeverage, setDraggingLeverage] = useState(initialLeverage);
  const [isDragging, setIsDragging] = useState(false);
  const [inputMethod, setInputMethod] = useState<'slider' | 'preset'>('slider');

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

  const handleConfirm = () => {
    DevLogger.log(
      `Confirming leverage: ${tempLeverage}, method: ${inputMethod}`,
    );

    onConfirm(tempLeverage, inputMethod);
    onClose();
  };

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

  const handleSliderChange = useCallback((value: number) => {
    setIsDragging(true);
    setDraggingLeverage(value);
  }, []);

  const handleSliderDragEnd = useCallback(
    (value: number) => {
      setIsDragging(false);
      if (value !== tempLeverage) {
        leverageChangeTime.current = Date.now();
        setLeverageChanged(true);
        lastValidLiquidationPrice.current = null;
      }
      setTempLeverage(value);
      setInputMethod('slider');
    },
    [tempLeverage],
  );

  const handleSliderGrip = useCallback(() => {
    playImpact(ImpactMoment.SliderGrip);
  }, []);

  const handleSliderMark = useCallback(() => {
    playImpact(ImpactMoment.SliderTick);
  }, []);

  const handleQuickSelect = useCallback(
    (value: number) => {
      setIsDragging(false);
      if (value !== tempLeverage) {
        leverageChangeTime.current = Date.now();
        setLeverageChanged(true);
        lastValidLiquidationPrice.current = null;
      }
      setTempLeverage(value);
      setDraggingLeverage(value);
      setInputMethod('preset');
      playSelection();
    },
    [tempLeverage],
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
        <View style={styles.container}>
          <View style={styles.leverageDisplay}>
            <Text variant={TextVariant.DisplayLg} color={TextColor.TextDefault}>
              {displayLeverage}x
            </Text>
          </View>

          <View style={styles.sliderContainer}>
            <Slider
              value={displayLeverage}
              onValueChange={handleSliderChange}
              onDragEnd={handleSliderDragEnd}
              minimumValue={minLeverage}
              maximumValue={maxLeverage}
              step={1}
              marks={sliderMarks}
              showRangeLabels
              showRangeDots
              onGrip={handleSliderGrip}
              onMark={handleSliderMark}
            />
          </View>

          <View style={styles.quickSelectButtons}>
            {quickSelectValues.map((value) => (
              <View key={value} style={styles.quickSelectButtonWrapper}>
                <Button
                  variant={ButtonVariant.Secondary}
                  size={ButtonSize.Md}
                  isFullWidth
                  onPress={() => handleQuickSelect(value)}
                  testID={`leverage-quick-select-${value}`}
                >
                  {`${value}x`}
                </Button>
              </View>
            ))}
          </View>

          <View style={styles.helpTextContainer}>
            {isRecalculating ? (
              <Skeleton width="80%" height={14} />
            ) : (
              <HelpText twClassName="w-full justify-center text-center">
                {strings('perps.order.leverage_modal.liquidation_warning', {
                  direction:
                    direction === 'long'
                      ? strings('perps.order.leverage_modal.drops')
                      : strings('perps.order.leverage_modal.rises'),
                  percentage: displayLiquidationPercentage ?? '--',
                })}
              </HelpText>
            )}
          </View>

          {currentPrice ? (
            <View style={styles.priceInfoContainer}>
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
            </View>
          ) : (
            <View style={styles.priceInfoContainer}>
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
                style={styles.emptyPriceInfo}
              >
                {strings('perps.order.leverage_modal.price_unavailable')}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <BottomSheetFooter
        primaryButtonProps={{
          size: ButtonSize.Lg,
          onPress: handleConfirm,
          children: strings('perps.order.leverage_modal.set_leverage', {
            leverage: displayLeverage,
          }),
          style: styles.footerButtonContainer,
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
