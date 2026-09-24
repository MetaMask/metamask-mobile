import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';

import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
  KeyValueRow,
  KeyValueRowVariant,
  Icon,
  IconName,
  IconSize,
  IconColor,
  HeaderStandard,
  HelpText,
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
import PerpsSlider from '../../components/PerpsSlider';
import PerpsValidationErrors from '../../components/PerpsValidationErrors';
import PerpsBottomSheetTooltip from '../../components/PerpsBottomSheetTooltip';
import { PerpsTooltipContentKey } from '../../components/PerpsBottomSheetTooltip/PerpsBottomSheetTooltip.types';
import Keypad from '../../../../Base/Keypad';
import { LIQUIDATION_DISTANCE_DECIMALS } from '../../constants/perpsConfig';
import {
  formatPerpsFiat,
  PRICE_RANGES_UNIVERSAL,
  PRICE_RANGES_MINIMAL_VIEW,
} from '../../utils/formatUtils';
import { ImpactMoment, useHaptics } from '../../../../../util/haptics';

interface AdjustMarginRouteParams {
  position: Position;
  mode: 'add' | 'remove';
  enableHaptics?: boolean;
}

const floorUsd = (value: number) => Math.floor(value * 100) / 100;

const PerpsAdjustMarginView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const route =
    useRoute<RouteProp<{ params: AdjustMarginRouteParams }, 'params'>>();
  const {
    position: routePosition,
    mode,
    enableHaptics = false,
  } = route.params || {};
  const { playImpact: playHapticImpact } = useHaptics();

  const [marginAmountString, setMarginAmountString] = useState('0');
  const [freshMaxAmount, setFreshMaxAmount] = useState<number | null>(null);
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
      onAmountChanged: (safeMaxAmount) => {
        submittedEstimateRef.current = null;
        setFreshMaxAmount(safeMaxAmount);
        setMarginAmountString(safeMaxAmount.toFixed(2));
      },
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
    hasValidPositionData,
    currentMargin,
    maxAmount,
    exchangeMaxAmount,
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

  // A stopped removal read a lower limit than the live snapshot; keep Max, the
  // slider and the submit check within it until the stream catches up to it or
  // the position itself changes. The stream re-sends positions on every PnL
  // tick, so only size, entry and leverage count as a change.
  const positionShape = position
    ? `${position.size}|${position.entryPrice}|${position.leverage?.value}`
    : '';
  useEffect(() => {
    setFreshMaxAmount(null);
  }, [positionShape]);
  useEffect(() => {
    if (freshMaxAmount !== null && floorUsd(maxAmount) <= freshMaxAmount) {
      setFreshMaxAmount(null);
    }
  }, [maxAmount, freshMaxAmount]);
  const capToFreshMax = (amount: number) =>
    freshMaxAmount === null || isAddMode
      ? amount
      : Math.min(amount, freshMaxAmount);
  const flooredMaxAmount = capToFreshMax(floorUsd(maxAmount));
  // Validate against what the exchange accepts, not the headroom-reduced max
  // offered by Max/slider, so a price tick after choosing Max does not block it.
  const submitLimitAmount = capToFreshMax(
    Number.isFinite(exchangeMaxAmount) && exchangeMaxAmount > flooredMaxAmount
      ? floorUsd(exchangeMaxAmount)
      : flooredMaxAmount,
  );
  const hasNoRemovableMargin =
    !isAddMode && !isLoading && hasValidPositionData && flooredMaxAmount <= 0;

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
    if (marginAmount > submitLimitAmount && marginAmount > 0) {
      return [
        isAddMode
          ? strings('perps.adjust_margin.exceeds_available')
          : strings('perps.errors.marginValidation.exceedsMaxRemovable'),
      ];
    }
    return [];
  }, [isInputFocused, marginAmount, submitLimitAmount, isAddMode]);

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
      return `${distance.toFixed(LIQUIDATION_DISTANCE_DECIMALS)}%`;
    },
    [],
  );

  const handleConfirm = useCallback(async () => {
    if (
      marginAmount <= 0 ||
      !position ||
      isAdjusting ||
      validationErrors.length
    ) {
      return;
    }

    // Prevent submission if amount exceeds max removable (extra safety for remove mode)
    if (
      !isAddMode &&
      (hasNoRemovableMargin || marginAmount > submitLimitAmount)
    ) {
      return;
    }

    if (enableHaptics) {
      playHapticImpact(ImpactMoment.PrimaryCTA).catch(() => undefined);
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
    enableHaptics,
    isAddMode,
    isAdjusting,
    validationErrors.length,
    submitLimitAmount,
    hasNoRemovableMargin,
    newLiquidationPrice,
    newLiquidationDistance,
    handleAddMargin,
    handleRemoveMargin,
    playHapticImpact,
  ]);

  const buttonLabel = isAddMode
    ? strings('perps.adjust_margin.add_margin')
    : strings('perps.adjust_margin.reduce_margin');

  // The route snapshot outlives the position, so once the live stream has
  // loaded without it there is nothing left to adjust margin on.
  const isPositionGone = !isLoading && !position;

  const isConfirmDisabled =
    hasNoRemovableMargin ||
    marginAmount <= 0 ||
    isAdjusting ||
    isPositionGone ||
    marginAmount > submitLimitAmount ||
    Boolean(validationErrors.length);

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

  // Use submitted estimate during exit animation, otherwise use live calculated values.
  const submittedEstimate = submittedEstimateRef.current;
  const displayNewLiquidationPrice =
    submittedEstimate?.price ?? newLiquidationPrice;
  const displayNewLiquidationDistance =
    submittedEstimate?.distance ?? newLiquidationDistance;
  const showTransition = marginAmount > 0 || submittedEstimate !== null;

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
          onPress={hasNoRemovableMargin ? undefined : handleAmountPress}
          isActive={isInputFocused}
          hasError={amountHasError}
          isLoading={isLoading}
          showMaxAmount={false}
        />

        {!isInputFocused && (
          <Box twClassName="px-4 py-4">
            <PerpsSlider
              value={sliderPercentage}
              onValueChange={handleSliderChange}
              disabled={isAdjusting || hasNoRemovableMargin}
              testID={PerpsAdjustMarginViewSelectorsIDs.SLIDER}
            />
          </Box>
        )}

        <PerpsValidationErrors errors={validationErrors} />

        {hasNoRemovableMargin && (
          <HelpText
            twClassName="px-4 justify-center text-center"
            testID={PerpsAdjustMarginViewSelectorsIDs.NO_REMOVABLE_MARGIN}
          >
            {strings('perps.adjust_margin.no_removable_margin')}
          </HelpText>
        )}
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
          <Box twClassName="px-4 pt-2">
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              twClassName="w-full"
              onPress={handleConfirm}
              isDisabled={isConfirmDisabled}
              isLoading={isAdjusting}
              testID={PerpsAdjustMarginViewSelectorsIDs.CONFIRM_BUTTON}
            >
              {buttonLabel}
            </Button>
          </Box>
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
