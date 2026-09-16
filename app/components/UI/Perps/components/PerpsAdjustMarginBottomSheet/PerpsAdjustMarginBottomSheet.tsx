import {
  BottomSheet,
  BottomSheetFooter,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonBaseSize,
  ButtonIcon,
  ButtonIconSize,
  ButtonIconVariant,
  ButtonSize,
  ButtonVariant,
  FilterButton,
  HeaderBase,
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
  } | null>(null);
  const { playImpact: playHapticImpact } = useHaptics();
  const [mode, setMode] = useState<PerpsAdjustMarginMode>(initialMode);
  const [marginAmountString, setMarginAmountString] = useState('0');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [selectedTooltip, setSelectedTooltip] =
    useState<PerpsTooltipContentKey | null>(null);

  useEffect(() => {
    sheetRef.current?.onOpenBottomSheet();
  }, []);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(navigation.goBack);
  }, [navigation]);

  const marginAmount = useMemo(
    () => Number.parseFloat(marginAmountString) || 0,
    [marginAmountString],
  );

  const { handleAddMargin, handleRemoveMargin, isAdjusting } =
    usePerpsMarginAdjustment({
      onSuccess: handleClose,
      onError: (errorMessage) => {
        submittedEstimateRef.current = null;
        Logger.error(new Error(errorMessage), {
          tags: { feature: PERPS_CONSTANTS.FeatureName },
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
    isAddMode,
  } = usePerpsAdjustMarginData({
    symbol: routePosition.symbol,
    mode,
    inputAmount: marginAmount,
  });

  const flooredMaxAmount = floorUsd(maxAmount);
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

  const handleModeChange = useCallback((nextMode: string) => {
    setMode(nextMode as PerpsAdjustMarginMode);
    setMarginAmountString('0');
    setIsInputFocused(false);
    submittedEstimateRef.current = null;
  }, []);

  const handleSliderChange = useCallback(
    (percentage: number) => {
      const amount = (flooredMaxAmount * percentage) / 100;
      setMarginAmountString(floorUsd(amount).toFixed(2));
    },
    [flooredMaxAmount],
  );

  const handlePercentagePress = useCallback(
    (percentage: number) => {
      setMarginAmountString(floorUsd(flooredMaxAmount * percentage).toFixed(2));
    },
    [flooredMaxAmount],
  );

  const handleKeypadChange = useCallback(
    ({ value }: { value: string }) => {
      const numericValue = Number.parseFloat(value) || 0;
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
      liquidationPrice === 0
        ? PERPS_CONSTANTS.FallbackDataDisplay
        : `${distance.toFixed(LIQUIDATION_DISTANCE_DECIMALS)}%`,
    [],
  );

  const handleConfirm = useCallback(async () => {
    if (
      marginAmount <= 0 ||
      !position ||
      isAdjusting ||
      validationErrors.length ||
      marginAmount > flooredMaxAmount
    ) {
      return;
    }

    if (enableHaptics) {
      playHapticImpact(ImpactMoment.PrimaryCTA).catch(() => undefined);
    }

    submittedEstimateRef.current = {
      price: newLiquidationPrice,
      distance: newLiquidationDistance,
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
  const nextMargin = isAddMode
    ? currentMargin + marginAmount
    : Math.max(0, currentMargin - marginAmount);
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

  const isPositionGone = !isLoading && !position;
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
        goBack={navigation.goBack}
        testID={PerpsAdjustMarginBottomSheetSelectorsIDs.CONTAINER}
      >
        <HeaderBase
          twClassName="px-4"
          endAccessory={
            <Box
              accessible={false}
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={2}
            >
              <SegmentedControl
                accessible={false}
                value={mode}
                onChange={handleModeChange}
                size={ButtonBaseSize.Sm}
                testID={PerpsAdjustMarginBottomSheetSelectorsIDs.MODE_TOGGLE}
              >
                <FilterButton
                  value="add"
                  startIconName={IconName.Add}
                  testID={
                    PerpsAdjustMarginBottomSheetSelectorsIDs.ADD_MODE_BUTTON
                  }
                >
                  {strings('perps.adjust_margin.add_margin_sheet')}
                </FilterButton>
                <FilterButton
                  value="remove"
                  startIconName={IconName.Minus}
                  testID={
                    PerpsAdjustMarginBottomSheetSelectorsIDs.REMOVE_MODE_BUTTON
                  }
                >
                  {strings('perps.adjust_margin.remove_margin_sheet')}
                </FilterButton>
              </SegmentedControl>
              <ButtonIcon
                iconName={IconName.Close}
                size={ButtonIconSize.Md}
                variant={ButtonIconVariant.Default}
                onPress={handleClose}
                accessibilityLabel={strings('navigation.close')}
                testID={PerpsAdjustMarginBottomSheetSelectorsIDs.CLOSE_BUTTON}
              />
            </Box>
          }
          textProps={{ accessibilityRole: 'header' }}
        >
          {strings('perps.adjust_margin.edit_title')}
        </HeaderBase>

        <PerpsAmountDisplay
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
          <Box accessible={false} paddingHorizontal={4} paddingVertical={3}>
            <Slider
              value={sliderPercentage}
              onValueChange={handleSliderChange}
              minimumValue={0}
              maximumValue={100}
              step={1}
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
          </Box>
        )}

        {validationErrors.map((error) => (
          <HelpText
            key={error}
            severity={HelpTextSeverity.Danger}
            twClassName="justify-center px-4 text-center"
            testID={PerpsAdjustMarginBottomSheetSelectorsIDs.ERROR}
            accessibilityRole="alert"
          >
            {error}
          </HelpText>
        ))}

        <Box accessible={false} paddingHorizontal={4}>
          <KeyValueRow
            variant={KeyValueRowVariant.Summary}
            keyLabel={strings('perps.adjust_margin.margin_in_position')}
            value={renderTransitionValue(
              formatPerpsFiat(currentMargin, {
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
              testID: PerpsAdjustMarginBottomSheetSelectorsIDs.AVAILABLE_VALUE,
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
