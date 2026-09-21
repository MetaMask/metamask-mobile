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

const isAdjustMarginMode = (value: string): value is PerpsAdjustMarginMode =>
  value === 'add' || value === 'remove';

interface PerpsAdjustMarginBottomSheetProps {
  position: Position;
  initialMode: PerpsAdjustMarginMode;
  enableHaptics?: boolean;
}

interface SubmittedEstimate {
  price: number;
  distance: number;
  currentMargin: number;
  nextMargin: number;
}

const floorUsd = (value: number) => Math.floor(value * 100) / 100;

const formatLiquidationDistance = (
  distance: number,
  liquidationPrice: number,
) =>
  !Number.isFinite(distance) ||
  !Number.isFinite(liquidationPrice) ||
  liquidationPrice <= 0
    ? PERPS_CONSTANTS.FallbackDataDisplay
    : `${distance.toFixed(LIQUIDATION_DISTANCE_DECIMALS)}%`;

const formatLiquidationPrice = (liquidationPrice: number) =>
  Number.isFinite(liquidationPrice) && liquidationPrice > 0
    ? formatPerpsFiat(liquidationPrice, {
        ranges: PRICE_RANGES_UNIVERSAL,
      })
    : PERPS_CONSTANTS.FallbackDataDisplay;

const PerpsAdjustMarginBottomSheet: React.FC<
  PerpsAdjustMarginBottomSheetProps
> = ({ position: routePosition, initialMode, enableHaptics = false }) => {
  const navigation = useNavigation<AppNavigationProp>();
  const sheetRef = useRef<BottomSheetRef>(null);
  const submittedEstimateRef = useRef<SubmittedEstimate | null>(null);
  const hasNavigatedBackRef = useRef(false);
  const { playImpact: playHapticImpact } = useHaptics();
  const [mode, setMode] = useState<PerpsAdjustMarginMode>(initialMode);
  const [marginAmountString, setMarginAmountString] = useState('0');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [selectedTooltip, setSelectedTooltip] =
    useState<PerpsTooltipContentKey | null>(null);
  const screenType =
    mode === 'add'
      ? PERPS_EVENT_VALUE.SCREEN_TYPE.ADD_MARGIN
      : PERPS_EVENT_VALUE.SCREEN_TYPE.REMOVE_MARGIN;
  const eventContext = {
    [PERPS_EVENT_PROPERTY.SCREEN_TYPE]: screenType,
    [PERPS_EVENT_PROPERTY.ASSET]: routePosition.symbol,
  };

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
        handleClose();
      },
      onError: (errorMessage) => {
        submittedEstimateRef.current = null;
        setSubmissionError(errorMessage);
        track(MetaMetricsEvents.PERPS_ERROR, {
          [PERPS_EVENT_PROPERTY.ERROR_TYPE]:
            PERPS_EVENT_VALUE.ERROR_TYPE.BACKEND,
          [PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: errorMessage,
          ...eventContext,
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
    hasValidPositionData,
    currentMargin,
    newMargin,
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

  const validationError = useMemo(() => {
    if (isInputFocused || marginAmount <= flooredMaxAmount) {
      return null;
    }
    return isAddMode
      ? strings('perps.adjust_margin.exceeds_available')
      : strings('perps.errors.marginValidation.exceedsMaxRemovable');
  }, [flooredMaxAmount, isAddMode, isInputFocused, marginAmount]);

  const isPositionGone = !isLoading && !position;
  const positionError = isPositionGone
    ? strings('perps.errors.position_not_found')
    : null;
  const isPositionDataInvalid =
    !isLoading && Boolean(position) && !hasValidPositionData;
  const positionDataError = isPositionDataInvalid
    ? strings('perps.adjust_margin.position_data_unavailable')
    : null;
  const displayedError =
    positionError ?? positionDataError ?? submissionError ?? validationError;
  const isValidationErrorDisplayed =
    Boolean(validationError) && displayedError === validationError;
  const hasInvalidAmount =
    marginAmount <= 0 ||
    marginAmount > flooredMaxAmount ||
    Boolean(validationError);

  usePerpsMeasurement({
    traceName: TraceName.PerpsAdjustMarginView,
    conditions: [!isAdjusting, !!position],
    debugContext: { mode, presentation: 'bottom_sheet' },
  });

  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
    resetKey: mode,
    properties: eventContext,
  });

  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_ERROR,
    conditions: [isValidationErrorDisplayed],
    resetConditions: [!isValidationErrorDisplayed],
    resetKey: mode,
    properties: {
      [PERPS_EVENT_PROPERTY.ERROR_TYPE]:
        PERPS_EVENT_VALUE.ERROR_TYPE.VALIDATION,
      [PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: validationError,
      ...eventContext,
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
      ...eventContext,
    },
  });

  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_ERROR,
    conditions: [isPositionDataInvalid],
    resetConditions: [!isPositionDataInvalid],
    properties: {
      [PERPS_EVENT_PROPERTY.ERROR_TYPE]:
        PERPS_EVENT_VALUE.ERROR_TYPE.VALIDATION,
      [PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: positionDataError,
      ...eventContext,
    },
  });

  const handleModeChange = useCallback(
    (nextMode: string) => {
      if (isAdjusting || !isAdjustMarginMode(nextMode)) {
        return;
      }
      setMode(nextMode);
      setMarginAmountString('0');
      setIsInputFocused(false);
      setSubmissionError(null);
      submittedEstimateRef.current = null;

      // Track explicit add/remove changes made with the treatment toggle.
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          nextMode === 'remove'
            ? PERPS_EVENT_VALUE.INTERACTION_TYPE.REMOVE_MARGIN
            : PERPS_EVENT_VALUE.INTERACTION_TYPE.ADD_MARGIN,
        [PERPS_EVENT_PROPERTY.ASSET]: routePosition.symbol,
        [PERPS_EVENT_PROPERTY.SOURCE]: PERPS_EVENT_VALUE.SOURCE.POSITION_SCREEN,
      });
    },
    [isAdjusting, routePosition.symbol, track],
  );

  const updateMarginAmount = useCallback((value: string) => {
    setSubmissionError(null);
    setMarginAmountString(value);
  }, []);

  const handleSliderChange = useCallback(
    (percentage: number) => {
      const amount = (flooredMaxAmount * percentage) / 100;
      updateMarginAmount(floorUsd(amount).toFixed(2));
    },
    [flooredMaxAmount, updateMarginAmount],
  );

  const handlePercentagePress = useCallback(
    (percentage: number) => {
      updateMarginAmount(floorUsd(flooredMaxAmount * percentage).toFixed(2));
    },
    [flooredMaxAmount, updateMarginAmount],
  );

  const handleKeypadChange = useCallback(
    ({ value }: { value: string }) => {
      const numericValue = Number.parseFloat(value) || 0;
      const nextValue =
        !isAddMode && numericValue > flooredMaxAmount
          ? flooredMaxAmount.toFixed(2)
          : value || '0';
      updateMarginAmount(nextValue);
    },
    [flooredMaxAmount, isAddMode, updateMarginAmount],
  );

  const handleConfirm = useCallback(async () => {
    if (hasInvalidAmount || !position || !hasValidPositionData || isAdjusting) {
      return;
    }

    if (enableHaptics) {
      playHapticImpact(ImpactMoment.PrimaryCTA).catch(() => undefined);
    }

    setSubmissionError(null);
    submittedEstimateRef.current = {
      price: newLiquidationPrice,
      distance: newLiquidationDistance,
      currentMargin,
      nextMargin: newMargin,
    };

    if (isAddMode) {
      await handleAddMargin(position.symbol, marginAmount);
      return;
    }
    await handleRemoveMargin(position.symbol, marginAmount);
  }, [
    enableHaptics,
    handleAddMargin,
    handleRemoveMargin,
    hasValidPositionData,
    hasInvalidAmount,
    currentMargin,
    isAddMode,
    isAdjusting,
    marginAmount,
    newMargin,
    newLiquidationDistance,
    newLiquidationPrice,
    playHapticImpact,
    position,
  ]);

  const submittedEstimate = submittedEstimateRef.current;
  const displayNewLiquidationPrice =
    submittedEstimate?.price ?? newLiquidationPrice;
  const displayNewLiquidationDistance =
    submittedEstimate?.distance ?? newLiquidationDistance;
  const displayCurrentMargin =
    submittedEstimate?.currentMargin ?? currentMargin;
  const displayNextMargin = submittedEstimate?.nextMargin ?? newMargin;
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
    hasInvalidAmount || isAdjusting || isPositionGone || isPositionDataInvalid;

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
              hasError={Boolean(validationError)}
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

            {displayedError && (
              <HelpText
                severity={HelpTextSeverity.Danger}
                twClassName="justify-center text-center"
                testID={PerpsAdjustMarginBottomSheetSelectorsIDs.ERROR}
                accessibilityRole="alert"
              >
                {displayedError}
              </HelpText>
            )}
          </Box>

          <Box accessible={false}>
            <KeyValueRow
              variant={KeyValueRowVariant.Summary}
              keyLabel={strings('perps.adjust_margin.margin_in_position')}
              value={renderTransitionValue(
                formatPerpsFiat(displayCurrentMargin, {
                  ranges: PRICE_RANGES_MINIMAL_VIEW,
                }),
                formatPerpsFiat(displayNextMargin, {
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
                formatLiquidationPrice(currentLiquidationPrice),
                formatLiquidationPrice(displayNewLiquidationPrice),
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
          <Box accessible={false} paddingHorizontal={4} paddingTop={3} gap={3}>
            <Box
              accessible={false}
              flexDirection={BoxFlexDirection.Row}
              gap={2}
            >
              {[
                { label: '25%', percentage: 0.25 },
                { label: '50%', percentage: 0.5 },
                {
                  label: strings('perps.deposit.max_button'),
                  percentage: 1,
                },
              ].map(({ label, percentage }) => (
                <Button
                  key={percentage}
                  variant={ButtonVariant.Secondary}
                  size={ButtonSize.Md}
                  onPress={() => handlePercentagePress(percentage)}
                  twClassName="flex-1"
                >
                  {label}
                </Button>
              ))}
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
