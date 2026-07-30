import React, { useState, useCallback, useMemo, useRef } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';

import {
  Box,
  BottomSheetFooter,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
  Slider,
  KeyValueRow,
  KeyValueRowVariant,
  Icon,
  IconName,
  IconSize,
  IconColor,
  HelpText,
  HelpTextSeverity,
  HeaderStandard,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import {
  type Position,
  PERPS_CONSTANTS,
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { PerpsAdjustMarginViewSelectorsIDs } from '../../Perps.testIds';
import { usePerpsMarginAdjustment } from '../../hooks/usePerpsMarginAdjustment';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { usePerpsMeasurement } from '../../hooks/usePerpsMeasurement';
import { usePerpsAdjustMarginData } from '../../hooks/usePerpsAdjustMarginData';
import { TraceName } from '../../../../../util/trace';
import Logger from '../../../../../util/Logger';
import PerpsAmountDisplay from '../../components/PerpsAmountDisplay';
import PerpsBottomSheetTooltip from '../../components/PerpsBottomSheetTooltip';
import { PerpsTooltipContentKey } from '../../components/PerpsBottomSheetTooltip/PerpsBottomSheetTooltip.types';
import Keypad from '../../../../Base/Keypad';
import {
  formatPerpsFiat,
  PRICE_RANGES_UNIVERSAL,
  PRICE_RANGES_MINIMAL_VIEW,
} from '../../utils/formatUtils';
import { ImpactMoment, playImpact } from '../../../../../util/haptics';

interface AdjustMarginRouteParams {
  position: Position;
  mode: 'add' | 'remove';
}

const floorUsd = (value: number) => Math.floor(value * 100) / 100;

const PerpsAdjustMarginView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const route =
    useRoute<RouteProp<{ params: AdjustMarginRouteParams }, 'params'>>();
  const { position: routePosition, mode } = route.params || {};

  const [marginAmountString, setMarginAmountString] = useState('0');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [selectedTooltip, setSelectedTooltip] =
    useState<PerpsTooltipContentKey | null>(null);
  // Captures the estimated liquidation values at submission time.
  // Displayed during exit animation so users see consistent values as the form closes,
  // rather than values recalculating as position data updates from WebSocket.
  // Uses ref (not state) since setting this shouldn't trigger a re-render.
  const submittedEstimateRef = useRef<{
    price: number;
    distance: number;
  } | null>(null);

  // Derived numeric value from string
  const marginAmount = useMemo(
    () => parseFloat(marginAmountString) || 0,
    [marginAmountString],
  );

  // Use margin adjustment hook for handling margin operations
  const { handleAddMargin, handleRemoveMargin, isAdjusting } =
    usePerpsMarginAdjustment({
      onSuccess: () => navigation.goBack(),
      onError: (errorMessage) => {
        submittedEstimateRef.current = null;
        Logger.error(new Error(errorMessage), {
          tags: {
            feature: PERPS_CONSTANTS.FeatureName,
          },
          context: {
            name: 'PerpsAdjustMarginView',
            data: {
              action: mode === 'remove' ? 'remove_margin' : 'add_margin',
              symbol: routePosition?.symbol,
              error: errorMessage,
            },
          },
        });
      },
    });

  // Get all margin data from dedicated hook (uses live subscriptions)
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
    symbol: routePosition?.symbol || '',
    mode: mode || 'add',
    inputAmount: marginAmount,
  });

  const flooredMaxAmount = floorUsd(maxAmount);

  const sliderPercentage = useMemo(() => {
    if (flooredMaxAmount <= 0) {
      return 0;
    }
    return Math.min(100, (marginAmount / flooredMaxAmount) * 100);
  }, [flooredMaxAmount, marginAmount]);

  const validationErrors = useMemo(() => {
    // Skip under keypad so messages don't flicker while typing
    if (isInputFocused) {
      return [];
    }
    if (marginAmount > flooredMaxAmount && marginAmount > 0) {
      return [
        isAddMode
          ? strings('perps.adjust_margin.exceeds_available')
          : strings('perps.errors.marginValidation.exceedsMaxRemovable'),
      ];
    }
    return [];
  }, [isInputFocused, marginAmount, flooredMaxAmount, isAddMode]);

  const amountHasError = validationErrors.length > 0;

  // Add performance measurement for this view
  usePerpsMeasurement({
    traceName: TraceName.PerpsAdjustMarginView,
    conditions: [!isAdjusting, !!position],
    debugContext: { mode },
  });

  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
    resetKey: mode,
    properties: {
      [PERPS_EVENT_PROPERTY.SCREEN_TYPE]: isAddMode
        ? PERPS_EVENT_VALUE.SCREEN_TYPE.ADD_MARGIN
        : PERPS_EVENT_VALUE.SCREEN_TYPE.REMOVE_MARGIN,
      [PERPS_EVENT_PROPERTY.ASSET]: routePosition?.symbol,
    },
  });

  const handleSliderChange = useCallback(
    (percentage: number) => {
      const amount = (flooredMaxAmount * percentage) / 100;
      setMarginAmountString(floorUsd(amount).toFixed(2));
    },
    [flooredMaxAmount],
  );

  const handleSliderGrip = useCallback(() => {
    playImpact(ImpactMoment.SliderGrip);
  }, []);

  const handleSliderMark = useCallback(() => {
    playImpact(ImpactMoment.SliderTick);
  }, []);

  const handleMaxPress = useCallback(() => {
    setMarginAmountString(flooredMaxAmount.toFixed(2));
  }, [flooredMaxAmount]);

  const handleAmountPress = useCallback(() => {
    setIsInputFocused(true);
  }, []);

  const handleKeypadChange = useCallback(
    ({ value }: { value: string }) => {
      const numValue = parseFloat(value) || 0;
      // Clamp to maxAmount for remove mode to prevent invalid submissions
      if (!isAddMode && numValue > flooredMaxAmount) {
        setMarginAmountString(flooredMaxAmount.toFixed(2));
      } else {
        setMarginAmountString(value || '0');
      }
    },
    [isAddMode, flooredMaxAmount],
  );

  const handleDonePress = useCallback(() => {
    setIsInputFocused(false);
  }, []);

  const handlePercentagePress = useCallback(
    (percentage: number) => {
      const amount = flooredMaxAmount * percentage;
      setMarginAmountString(floorUsd(amount).toFixed(2));
    },
    [flooredMaxAmount],
  );

  const handleTooltipPress = useCallback(
    (contentKey: PerpsTooltipContentKey) => {
      setSelectedTooltip(contentKey);
    },
    [],
  );

  const handleTooltipClose = useCallback(() => {
    setSelectedTooltip(null);
  }, []);

  const formatLiquidationDistance = useCallback(
    (distance: number, liquidationPrice: number): string => {
      if (liquidationPrice === 0) {
        return PERPS_CONSTANTS.FallbackDataDisplay;
      }
      return `${distance.toFixed(0)}%`;
    },
    [],
  );

  const handleConfirm = useCallback(async () => {
    if (marginAmount <= 0 || !position) return;

    // Prevent submission if amount exceeds max removable (extra safety for remove mode)
    if (!isAddMode && marginAmount > flooredMaxAmount) {
      return;
    }

    // Capture estimates at submission - displayed during exit animation
    submittedEstimateRef.current = {
      price: newLiquidationPrice,
      distance: newLiquidationDistance,
    };

    if (isAddMode) {
      await handleAddMargin(position.symbol, marginAmount);
    } else {
      await handleRemoveMargin(position.symbol, marginAmount);
    }
  }, [
    marginAmount,
    position,
    isAddMode,
    flooredMaxAmount,
    newLiquidationPrice,
    newLiquidationDistance,
    handleAddMargin,
    handleRemoveMargin,
  ]);

  // Show error if no position found (either from route or live data)
  if ((!routePosition && !position) || !mode) {
    return (
      <SafeAreaView style={tw.style('flex-1 bg-default')}>
        <Box twClassName="flex-1 items-center justify-center p-6">
          <Text variant={TextVariant.BodyMd} color={TextColor.ErrorDefault}>
            {strings('perps.errors.position_not_found')}
          </Text>
        </Box>
      </SafeAreaView>
    );
  }

  const title = isAddMode
    ? strings('perps.adjust_margin.add_title')
    : strings('perps.adjust_margin.remove_title');

  const buttonLabel = isAddMode
    ? strings('perps.adjust_margin.add_margin')
    : strings('perps.adjust_margin.reduce_margin');

  // Use submitted estimate during exit animation, otherwise use live calculated values.
  const submittedEstimate = submittedEstimateRef.current;
  const displayNewLiquidationPrice =
    submittedEstimate?.price ?? newLiquidationPrice;
  const displayNewLiquidationDistance =
    submittedEstimate?.distance ?? newLiquidationDistance;
  const showTransition = marginAmount > 0 || submittedEstimate !== null;

  const isConfirmDisabled =
    marginAmount <= 0 ||
    isAdjusting ||
    marginAmount > flooredMaxAmount ||
    Boolean(validationErrors.length);

  const confirmButtonProps = useMemo(
    () => ({
      children: buttonLabel,
      onPress: handleConfirm,
      size: ButtonSize.Lg,
      isDisabled: isConfirmDisabled,
      isLoading: isAdjusting,
      testID: PerpsAdjustMarginViewSelectorsIDs.CONFIRM_BUTTON,
    }),
    [buttonLabel, handleConfirm, isConfirmDisabled, isAdjusting],
  );

  const renderTransitionValue = (
    currentDisplay: string,
    nextDisplay: string,
    testID: string,
  ) =>
    showTransition ? (
      <Box twClassName="flex-row items-center gap-2">
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {currentDisplay}
        </Text>
        <Icon
          name={IconName.ArrowRight}
          size={IconSize.Sm}
          color={IconColor.IconAlternative}
          accessibilityLabel="ArrowRight"
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

  const Summary = (
    <Box twClassName="pt-4 pb-4 gap-1">
      <KeyValueRow
        variant={KeyValueRowVariant.Summary}
        keyLabel={strings('perps.adjust_margin.margin_in_position')}
        value={formatPerpsFiat(currentMargin, {
          ranges: PRICE_RANGES_MINIMAL_VIEW,
        })}
      />
      <KeyValueRow
        variant={KeyValueRowVariant.Summary}
        keyLabel={
          isAddMode
            ? strings('perps.adjust_margin.margin_available_to_add')
            : strings('perps.adjust_margin.margin_available_to_remove')
        }
        value={formatPerpsFiat(flooredMaxAmount, {
          ranges: PRICE_RANGES_MINIMAL_VIEW,
        })}
        valueTextProps={{
          testID: PerpsAdjustMarginViewSelectorsIDs.AVAILABLE_VALUE,
        }}
      />
      <KeyValueRow
        variant={KeyValueRowVariant.Summary}
        keyLabel={strings('perps.adjust_margin.liquidation_price')}
        keyEndButtonIconProps={{
          iconName: IconName.Info,
          onPress: () => handleTooltipPress('liquidation_price'),
        }}
        value={renderTransitionValue(
          formatPerpsFiat(currentLiquidationPrice, {
            ranges: PRICE_RANGES_UNIVERSAL,
          }),
          formatPerpsFiat(displayNewLiquidationPrice, {
            ranges: PRICE_RANGES_UNIVERSAL,
          }),
          PerpsAdjustMarginViewSelectorsIDs.LIQUIDATION_PRICE_VALUE,
        )}
      />
      <KeyValueRow
        variant={KeyValueRowVariant.Summary}
        keyLabel={strings('perps.adjust_margin.liquidation_distance')}
        keyEndButtonIconProps={{
          iconName: IconName.Info,
          onPress: () => handleTooltipPress('liquidation_distance'),
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
          PerpsAdjustMarginViewSelectorsIDs.LIQUIDATION_DISTANCE_VALUE,
        )}
      />
    </Box>
  );

  return (
    <SafeAreaView style={tw.style('flex-1 bg-default')} edges={['bottom']}>
      <HeaderStandard
        includesTopInset
        title={title}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={tw.style('flex-1')}
        alwaysBounceVertical={false}
        contentContainerStyle={tw.style(isInputFocused ? 'pb-[100px]' : 'pb-5')}
        showsVerticalScrollIndicator={false}
      >
        <PerpsAmountDisplay
          amount={marginAmountString}
          onPress={handleAmountPress}
          isActive={isInputFocused}
          hasError={amountHasError}
          isLoading={isLoading}
          showMaxAmount={false}
        />

        {!isInputFocused && (
          <Box twClassName="px-4 py-4">
            <Slider
              value={sliderPercentage}
              onValueChange={handleSliderChange}
              minimumValue={0}
              maximumValue={100}
              step={1}
              showRangeLabels
              showRangeDots
              isDisabled={isAdjusting}
              onGrip={handleSliderGrip}
              onMark={handleSliderMark}
              testID={PerpsAdjustMarginViewSelectorsIDs.SLIDER}
            />
          </Box>
        )}

        <Box twClassName="items-center justify-start px-4 my-4 min-h-10">
          {validationErrors.map((error, index) => (
            <HelpText
              key={`error-${index}`}
              severity={HelpTextSeverity.Danger}
              twClassName="w-full justify-center text-center"
            >
              {error}
            </HelpText>
          ))}
        </Box>
      </ScrollView>

      {isInputFocused && (
        <Box twClassName="pt-4">
          {Summary}
          <Box twClassName="flex-row justify-between px-4 mb-3 gap-2">
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
              onPress={handleMaxPress}
              twClassName="flex-1"
            >
              {strings('perps.deposit.max_button')}
            </Button>
            <Button
              testID={PerpsAdjustMarginViewSelectorsIDs.DONE_BUTTON}
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Md}
              onPress={handleDonePress}
              twClassName="flex-1"
            >
              {strings('perps.deposit.done_button')}
            </Button>
          </Box>

          <Box twClassName="px-4">
            <Keypad
              value={marginAmountString}
              onChange={handleKeypadChange}
              currency="USD"
              decimals={2}
            />
          </Box>
        </Box>
      )}

      <Box twClassName="w-full pb-4">
        {!isInputFocused && Summary}
        {!isInputFocused && (
          <BottomSheetFooter primaryButtonProps={confirmButtonProps} />
        )}
      </Box>

      {selectedTooltip && (
        <PerpsBottomSheetTooltip
          isVisible
          onClose={handleTooltipClose}
          contentKey={selectedTooltip}
          key={selectedTooltip}
        />
      )}
    </SafeAreaView>
  );
};

export default PerpsAdjustMarginView;
