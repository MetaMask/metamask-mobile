import {
  BottomSheet,
  BottomSheetFooter,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonBaseSize,
  ButtonSize,
  ButtonVariant,
  FilterButton,
  FontWeight,
  HeaderSubpage,
  HelpText,
  HelpTextSeverity,
  Icon,
  IconColor,
  IconName,
  IconSize,
  KeyValueRow,
  KeyValueRowVariant,
  SegmentedControl,
  Slider,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import {
  PERPS_CONSTANTS,
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  type Position,
} from '@metamask/perps-controller';
import { useNavigation } from '@react-navigation/native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { strings } from '../../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Logger from '../../../../../util/Logger';
import {
  ImpactMoment,
  playImpact,
  useHaptics,
} from '../../../../../util/haptics';
import { TraceName } from '../../../../../util/trace';
import Keypad from '../../../../Base/Keypad';
import { LIQUIDATION_DISTANCE_DECIMALS } from '../../constants/perpsConfig';
import { PerpsAdjustMarginBottomSheetSelectorsIDs } from '../../Perps.testIds';
import { usePerpsAdjustMarginData } from '../../hooks/usePerpsAdjustMarginData';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { usePerpsMarginAdjustment } from '../../hooks/usePerpsMarginAdjustment';
import { usePerpsMeasurement } from '../../hooks/usePerpsMeasurement';
import {
  formatPerpsFiat,
  PRICE_RANGES_MINIMAL_VIEW,
  PRICE_RANGES_UNIVERSAL,
} from '../../utils/formatUtils';
import LivePriceHeader from '../LivePriceDisplay/LivePriceHeader';
import PerpsAmountDisplay from '../PerpsAmountDisplay';
import PerpsBottomSheetTooltip from '../PerpsBottomSheetTooltip';
import { PerpsTooltipContentKey } from '../PerpsBottomSheetTooltip/PerpsBottomSheetTooltip.types';

export type PerpsAdjustMarginMode = 'add' | 'remove';

interface PerpsAdjustMarginBottomSheetProps {
  position: Position;
  initialMode: PerpsAdjustMarginMode;
  enableHaptics?: boolean;
}

const floorUsd = (value: number) => Math.floor(value * 100) / 100;

const PerpsAdjustMarginBottomSheet: React.FC<
  PerpsAdjustMarginBottomSheetProps
> = ({ position: routePosition, initialMode, enableHaptics = false }) => {
  const navigation = useNavigation<AppNavigationProp>();
  const sheetRef = useRef<BottomSheetRef>(null);
  const submittedEstimateRef = useRef<{
    price: number;
    distance: number;
    currentMargin: number;
    nextMargin: number;
  } | null>(null);
  const adjustmentPendingRef = useRef(false);
  const hasNavigatedBackRef = useRef(false);
  const { playImpact: playHapticImpact } = useHaptics();
  const [mode, setMode] = useState<PerpsAdjustMarginMode>(initialMode);
  const [marginAmountString, setMarginAmountString] = useState('0');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [selectedTooltip, setSelectedTooltip] =
    useState<PerpsTooltipContentKey | null>(null);

  useEffect(() => {
    sheetRef.current?.onOpenBottomSheet();
  }, []);

  const handleNavigationGoBack = useCallback(() => {
    if (hasNavigatedBackRef.current) {
      return;
    }
    hasNavigatedBackRef.current = true;
    navigation.goBack();
  }, [navigation]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(handleNavigationGoBack);
  }, [handleNavigationGoBack]);

  const marginAmount = useMemo(() => {
    const parsedAmount = Number.parseFloat(marginAmountString);
    return Number.isFinite(parsedAmount) ? parsedAmount : 0;
  }, [marginAmountString]);

  const { track } = usePerpsEventTracking();

  const { handleAddMargin, handleRemoveMargin, isAdjusting } =
    usePerpsMarginAdjustment({
      onSuccess: () => {
        adjustmentPendingRef.current = false;
        handleClose();
      },
      onError: (errorMessage) => {
        adjustmentPendingRef.current = false;
        submittedEstimateRef.current = null;
        setSubmissionError(errorMessage);
        track(MetaMetricsEvents.PERPS_ERROR, {
          [PERPS_EVENT_PROPERTY.ERROR_TYPE]:
            PERPS_EVENT_VALUE.ERROR_TYPE.BACKEND,
          [PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: errorMessage,
          [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
            mode === 'remove'
              ? PERPS_EVENT_VALUE.SCREEN_TYPE.REMOVE_MARGIN
              : PERPS_EVENT_VALUE.SCREEN_TYPE.ADD_MARGIN,
          [PERPS_EVENT_PROPERTY.ASSET]: routePosition.symbol,
        });
        Logger.error(new Error(errorMessage), {
          tags: {
            feature: PERPS_CONSTANTS.FeatureName,
            component: 'PerpsAdjustMarginBottomSheet',
            action: mode === 'remove' ? 'margin_remove' : 'margin_add',
            operation: 'position_management',
          },
          context: {
            name: 'PerpsAdjustMarginBottomSheet',
            data: {
              action: mode === 'remove' ? 'remove_margin' : 'add_margin',
              symbol: routePosition.symbol,
              error: errorMessage,
            },
          },
        });
      },
    });

  const {
    position,
    isLoading,
    currentMargin,
    maxAmount,
    currentLiquidationPrice,
    newLiquidationPrice,
    currentLiquidationDistance,
    newLiquidationDistance,
    currentPrice,
    isAddMode,
  } = usePerpsAdjustMarginData({
    symbol: routePosition.symbol,
    mode,
    inputAmount: marginAmount,
  });

  const flooredMaxAmount =
    Number.isFinite(maxAmount) && maxAmount > 0 ? floorUsd(maxAmount) : 0;
  const sliderPercentage = useMemo(
    () =>
      flooredMaxAmount <= 0
        ? 0
        : Math.min(100, (marginAmount / flooredMaxAmount) * 100),
    [flooredMaxAmount, marginAmount],
  );

  const validationErrors = useMemo(() => {
    if (isInputFocused || marginAmount <= flooredMaxAmount) {
      return [];
    }
    return [
      isAddMode
        ? strings('perps.adjust_margin.exceeds_available')
        : strings('perps.errors.marginValidation.exceedsMaxRemovable'),
    ];
  }, [flooredMaxAmount, isAddMode, isInputFocused, marginAmount]);

  const isPositionGone = !isLoading && !position;
  const positionError = isPositionGone
    ? strings('perps.errors.position_not_found')
    : null;
  const displayedErrors = [
    ...validationErrors,
    ...(submissionError ? [submissionError] : []),
    ...(positionError ? [positionError] : []),
  ];

  usePerpsMeasurement({
    traceName: TraceName.PerpsAdjustMarginView,
    conditions: [!isAdjusting, !!position],
    debugContext: { mode, presentation: 'bottom_sheet' },
  });

  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
    resetKey: mode,
    properties: {
      [PERPS_EVENT_PROPERTY.SCREEN_TYPE]: isAddMode
        ? PERPS_EVENT_VALUE.SCREEN_TYPE.ADD_MARGIN
        : PERPS_EVENT_VALUE.SCREEN_TYPE.REMOVE_MARGIN,
      [PERPS_EVENT_PROPERTY.ASSET]: routePosition.symbol,
    },
  });

  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_ERROR,
    conditions: [validationErrors.length > 0],
    resetConditions: [validationErrors.length === 0],
    resetKey: mode,
    properties: {
      [PERPS_EVENT_PROPERTY.ERROR_TYPE]:
        PERPS_EVENT_VALUE.ERROR_TYPE.VALIDATION,
      [PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: validationErrors[0],
      [PERPS_EVENT_PROPERTY.SCREEN_TYPE]: isAddMode
        ? PERPS_EVENT_VALUE.SCREEN_TYPE.ADD_MARGIN
        : PERPS_EVENT_VALUE.SCREEN_TYPE.REMOVE_MARGIN,
      [PERPS_EVENT_PROPERTY.ASSET]: routePosition.symbol,
    },
  });

  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_ERROR,
    conditions: [isPositionGone],
    resetConditions: [!isPositionGone],
    properties: {
      [PERPS_EVENT_PROPERTY.ERROR_TYPE]:
        PERPS_EVENT_VALUE.ERROR_TYPE.VALIDATION,
      [PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: positionError,
      [PERPS_EVENT_PROPERTY.SCREEN_TYPE]: isAddMode
        ? PERPS_EVENT_VALUE.SCREEN_TYPE.ADD_MARGIN
        : PERPS_EVENT_VALUE.SCREEN_TYPE.REMOVE_MARGIN,
      [PERPS_EVENT_PROPERTY.ASSET]: routePosition.symbol,
    },
  });

  const handleModeChange = useCallback(
    (nextMode: string) => {
      if (adjustmentPendingRef.current) {
        return;
      }
      setMode(nextMode as PerpsAdjustMarginMode);
      setMarginAmountString('0');
      setIsInputFocused(false);
      setSubmissionError(null);
      submittedEstimateRef.current = null;

      // The toggle replaces the action-choice sheet under treatment, so it
      // carries that sheet's add/remove selection event.
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          nextMode === 'remove'
            ? PERPS_EVENT_VALUE.INTERACTION_TYPE.REMOVE_MARGIN
            : PERPS_EVENT_VALUE.INTERACTION_TYPE.ADD_MARGIN,
        [PERPS_EVENT_PROPERTY.ASSET]: routePosition.symbol,
        [PERPS_EVENT_PROPERTY.SOURCE]: PERPS_EVENT_VALUE.SOURCE.POSITION_SCREEN,
      });
    },
    [routePosition.symbol, track],
  );

  const handleSliderChange = useCallback(
    (percentage: number) => {
      const amount = (flooredMaxAmount * percentage) / 100;
      setSubmissionError(null);
      setMarginAmountString(floorUsd(amount).toFixed(2));
    },
    [flooredMaxAmount],
  );

  const handlePercentagePress = useCallback(
    (percentage: number) => {
      setSubmissionError(null);
      setMarginAmountString(floorUsd(flooredMaxAmount * percentage).toFixed(2));
    },
    [flooredMaxAmount],
  );

  const handleKeypadChange = useCallback(
    ({ value }: { value: string }) => {
      const numericValue = Number.parseFloat(value) || 0;
      setSubmissionError(null);
      if (!isAddMode && numericValue > flooredMaxAmount) {
        setMarginAmountString(flooredMaxAmount.toFixed(2));
        return;
      }
      setMarginAmountString(value || '0');
    },
    [flooredMaxAmount, isAddMode],
  );

  const formatLiquidationDistance = useCallback(
    (distance: number, liquidationPrice: number) =>
      !Number.isFinite(distance) ||
      !Number.isFinite(liquidationPrice) ||
      liquidationPrice <= 0
        ? PERPS_CONSTANTS.FallbackDataDisplay
        : `${distance.toFixed(LIQUIDATION_DISTANCE_DECIMALS)}%`,
    [],
  );

  const handleConfirm = useCallback(async () => {
    if (
      marginAmount <= 0 ||
      !position ||
      isAdjusting ||
      adjustmentPendingRef.current ||
      validationErrors.length ||
      marginAmount > flooredMaxAmount
    ) {
      return;
    }

    if (enableHaptics) {
      playHapticImpact(ImpactMoment.PrimaryCTA).catch(() => undefined);
    }

    adjustmentPendingRef.current = true;
    setSubmissionError(null);
    submittedEstimateRef.current = {
      price: newLiquidationPrice,
      distance: newLiquidationDistance,
      currentMargin,
      nextMargin: isAddMode
        ? currentMargin + marginAmount
        : Math.max(0, currentMargin - marginAmount),
    };

    if (isAddMode) {
      await handleAddMargin(position.symbol, marginAmount);
      return;
    }
    await handleRemoveMargin(position.symbol, marginAmount);
  }, [
    enableHaptics,
    flooredMaxAmount,
    handleAddMargin,
    handleRemoveMargin,
    currentMargin,
    isAddMode,
    isAdjusting,
    marginAmount,
    newLiquidationDistance,
    newLiquidationPrice,
    playHapticImpact,
    position,
    validationErrors.length,
  ]);

  const submittedEstimate = submittedEstimateRef.current;
  const displayNewLiquidationPrice =
    submittedEstimate?.price ?? newLiquidationPrice;
  const displayNewLiquidationDistance =
    submittedEstimate?.distance ?? newLiquidationDistance;
  const displayCurrentMargin =
    submittedEstimate?.currentMargin ?? currentMargin;
  const nextMargin =
    submittedEstimate?.nextMargin ??
    (isAddMode
      ? currentMargin + marginAmount
      : Math.max(0, currentMargin - marginAmount));
  const showTransition = marginAmount > 0 || submittedEstimate !== null;

  const renderTransitionValue = (
    currentDisplay: string,
    nextDisplay: string,
    testID: string,
  ) =>
    showTransition ? (
      <Box
        accessible={false}
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={2}
      >
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {currentDisplay}
        </Text>
        <Icon
          name={IconName.ArrowRight}
          size={IconSize.Sm}
          color={IconColor.IconAlternative}
        />
        <Text variant={TextVariant.BodyMd} testID={testID}>
          {nextDisplay}
        </Text>
      </Box>
    ) : (
      <Text variant={TextVariant.BodyMd} testID={testID}>
        {currentDisplay}
      </Text>
    );

  const isConfirmDisabled =
    marginAmount <= 0 ||
    isAdjusting ||
    isPositionGone ||
    marginAmount > flooredMaxAmount ||
    Boolean(validationErrors.length);

  return (
    <>
      <BottomSheet
        ref={sheetRef}
        goBack={handleNavigationGoBack}
        testID={PerpsAdjustMarginBottomSheetSelectorsIDs.CONTAINER}
      >
        <HeaderSubpage
          twClassName="h-16 min-h-[64px] px-4"
          accessoryGap={2}
          title={strings('perps.adjust_margin.edit_title')}
          titleProps={{
            variant: TextVariant.HeadingSm,
            // `Bold` resolves to Inter-SemiBold, matching the design's Heading/Sm.
            fontWeight: FontWeight.Bold,
            accessibilityRole: 'header',
          }}
          description={
            <LivePriceHeader
              symbol={routePosition.symbol}
              currentPrice={currentPrice}
            />
          }
          endAccessory={
            <SegmentedControl
              accessible={false}
              value={mode}
              onChange={handleModeChange}
              size={ButtonBaseSize.Sm}
              testID={PerpsAdjustMarginBottomSheetSelectorsIDs.MODE_TOGGLE}
            >
              <FilterButton
                value="add"
                disabled={isAdjusting}
                startIconName={IconName.Add}
                testID={
                  PerpsAdjustMarginBottomSheetSelectorsIDs.ADD_MODE_BUTTON
                }
              >
                {strings('perps.adjust_margin.add_toggle')}
              </FilterButton>
              <FilterButton
                value="remove"
                disabled={isAdjusting}
                startIconName={IconName.Minus}
                testID={
                  PerpsAdjustMarginBottomSheetSelectorsIDs.REMOVE_MODE_BUTTON
                }
              >
                {strings('perps.adjust_margin.remove_toggle')}
              </FilterButton>
            </SegmentedControl>
          }
        />

        <Box accessible={false} twClassName="gap-4 py-3">
          <Box accessible={false} twClassName="gap-4 px-4">
            <PerpsAmountDisplay
              variant="tradeSheet"
              amount={marginAmountString}
              onPress={() => setIsInputFocused(true)}
              isActive={isInputFocused}
              hasError={Boolean(validationErrors.length)}
              isLoading={isLoading}
              showMaxAmount={false}
              accessibilityLabel={`${strings(
                'perps.adjust_margin.amount_accessibility_label',
              )}, ${marginAmountString}`}
            />

            {!isInputFocused && (
              <Slider
                // Remount on mode change so the thumb returns to 0. The slider
                // ignores an incoming value that matches one of its own recent
                // drag positions, treating it as a stale echo, so a drag that
                // passed through 0 would otherwise leave the thumb in place.
                key={mode}
                value={sliderPercentage}
                onValueChange={handleSliderChange}
                minimumValue={0}
                maximumValue={100}
                step={1}
                // Keeps the track inset at the design's 8px within the 16px
                // content padding while leaving room for the thumb overhang.
                trackInset={8}
                showRangeLabels
                showRangeDots
                isDisabled={isAdjusting}
                onGrip={() => playImpact(ImpactMoment.SliderGrip)}
                onMark={() => playImpact(ImpactMoment.SliderTick)}
                accessibilityLabel={strings(
                  'perps.adjust_margin.slider_accessibility_label',
                )}
                testID={PerpsAdjustMarginBottomSheetSelectorsIDs.SLIDER}
              />
            )}

            {displayedErrors.map((error, index) => (
              <HelpText
                key={`${error}-${index}`}
                severity={HelpTextSeverity.Danger}
                twClassName="justify-center text-center"
                testID={PerpsAdjustMarginBottomSheetSelectorsIDs.ERROR}
                accessibilityRole="alert"
              >
                {error}
              </HelpText>
            ))}
          </Box>

          <Box accessible={false}>
            <KeyValueRow
              variant={KeyValueRowVariant.Summary}
              keyLabel={strings('perps.adjust_margin.margin_in_position')}
              value={renderTransitionValue(
                formatPerpsFiat(displayCurrentMargin, {
                  ranges: PRICE_RANGES_MINIMAL_VIEW,
                }),
                formatPerpsFiat(nextMargin, {
                  ranges: PRICE_RANGES_MINIMAL_VIEW,
                }),
                PerpsAdjustMarginBottomSheetSelectorsIDs.MARGIN_VALUE,
              )}
            />
            <KeyValueRow
              variant={KeyValueRowVariant.Summary}
              keyLabel={
                isAddMode
                  ? strings('perps.adjust_margin.available_to_add')
                  : strings('perps.adjust_margin.available_to_remove')
              }
              value={formatPerpsFiat(flooredMaxAmount, {
                ranges: PRICE_RANGES_MINIMAL_VIEW,
              })}
              valueTextProps={{
                testID:
                  PerpsAdjustMarginBottomSheetSelectorsIDs.AVAILABLE_VALUE,
              }}
            />
            <KeyValueRow
              variant={KeyValueRowVariant.Summary}
              keyLabel={strings('perps.adjust_margin.liquidation_price')}
              keyEndButtonIconProps={{
                iconName: IconName.Info,
                onPress: () => setSelectedTooltip('liquidation_price'),
                accessibilityLabel: `${strings(
                  'perps.adjust_margin.liquidation_price',
                )} ${strings('navigation.info')}`,
              }}
              value={renderTransitionValue(
                formatPerpsFiat(currentLiquidationPrice, {
                  ranges: PRICE_RANGES_UNIVERSAL,
                }),
                formatPerpsFiat(displayNewLiquidationPrice, {
                  ranges: PRICE_RANGES_UNIVERSAL,
                }),
                PerpsAdjustMarginBottomSheetSelectorsIDs.LIQUIDATION_PRICE_VALUE,
              )}
            />
            <KeyValueRow
              variant={KeyValueRowVariant.Summary}
              keyLabel={strings('perps.adjust_margin.liquidation_distance')}
              keyEndButtonIconProps={{
                iconName: IconName.Info,
                onPress: () => setSelectedTooltip('liquidation_distance'),
                accessibilityLabel: `${strings(
                  'perps.adjust_margin.liquidation_distance',
                )} ${strings('navigation.info')}`,
              }}
              value={renderTransitionValue(
                formatLiquidationDistance(
                  currentLiquidationDistance,
                  currentLiquidationPrice,
                ),
                formatLiquidationDistance(
                  displayNewLiquidationDistance,
                  displayNewLiquidationPrice,
                ),
                PerpsAdjustMarginBottomSheetSelectorsIDs.LIQUIDATION_DISTANCE_VALUE,
              )}
            />
          </Box>
        </Box>

        {isInputFocused && (
          <Box accessible={false} paddingHorizontal={4} paddingTop={3}>
            <Box
              accessible={false}
              flexDirection={BoxFlexDirection.Row}
              gap={2}
            >
              <Button
                variant={ButtonVariant.Secondary}
                size={ButtonSize.Md}
                onPress={() => handlePercentagePress(0.25)}
                twClassName="flex-1"
              >
                25%
              </Button>
              <Button
                variant={ButtonVariant.Secondary}
                size={ButtonSize.Md}
                onPress={() => handlePercentagePress(0.5)}
                twClassName="flex-1"
              >
                50%
              </Button>
              <Button
                variant={ButtonVariant.Secondary}
                size={ButtonSize.Md}
                onPress={() => handlePercentagePress(1)}
                twClassName="flex-1"
              >
                {strings('perps.deposit.max_button')}
              </Button>
              <Button
                variant={ButtonVariant.Secondary}
                size={ButtonSize.Md}
                onPress={() => setIsInputFocused(false)}
                twClassName="flex-1"
                testID={PerpsAdjustMarginBottomSheetSelectorsIDs.DONE_BUTTON}
              >
                {strings('perps.deposit.done_button')}
              </Button>
            </Box>
            <Keypad
              value={marginAmountString}
              onChange={handleKeypadChange}
              currency="USD"
              decimals={2}
            />
          </Box>
        )}

        {!isInputFocused && (
          <BottomSheetFooter
            twClassName="border-t border-muted pt-4 pb-2"
            primaryButtonProps={{
              children: isAddMode
                ? strings('perps.adjust_margin.add_margin_sheet')
                : strings('perps.adjust_margin.remove_margin_sheet'),
              size: ButtonSize.Lg,
              onPress: handleConfirm,
              isDisabled: isConfirmDisabled,
              isLoading: isAdjusting,
              testID: PerpsAdjustMarginBottomSheetSelectorsIDs.CONFIRM_BUTTON,
            }}
          />
        )}
      </BottomSheet>

      {selectedTooltip && (
        <PerpsBottomSheetTooltip
          isVisible
          onClose={() => setSelectedTooltip(null)}
          contentKey={selectedTooltip}
          key={selectedTooltip}
        />
      )}
    </>
  );
};

export default PerpsAdjustMarginBottomSheet;
