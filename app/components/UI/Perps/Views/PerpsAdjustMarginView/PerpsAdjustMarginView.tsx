import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';

import { useStyles } from '../../../../../component-library/hooks';
import {
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
import { strings } from '../../../../../../locales/i18n';
import {
  type Position,
  PERPS_CONSTANTS,
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import styleSheet from './PerpsAdjustMarginView.styles';
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
import { usePerpsClosePositionVisualStatePicker } from '../../Debug/usePerpsClosePositionVisualStatePicker';

interface AdjustMarginRouteParams {
  position: Position;
  mode: 'add' | 'remove';
}

const floorUsd = (value: number) => Math.floor(value * 100) / 100;

const PerpsAdjustMarginView: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const route =
    useRoute<RouteProp<{ params: AdjustMarginRouteParams }, 'params'>>();
  const { position: routePosition, mode } = route.params || {};
  const { styles } = useStyles(styleSheet, {});

  const {
    visualOverrides,
    renderFlask,
    sheet: visualStateSheet,
  } = usePerpsClosePositionVisualStatePicker('margin');

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
  const {
    handleAddMargin,
    handleRemoveMargin,
    isAdjusting: isAdjustingLive,
  } = usePerpsMarginAdjustment({
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

  // Sync amount when a __DEV__ visual preset forces a slider percentage
  useEffect(() => {
    if (visualOverrides?.forceMarginPercentage === undefined) {
      return;
    }
    setMarginAmountString(
      floorUsd(
        (flooredMaxAmount * visualOverrides.forceMarginPercentage) / 100,
      ).toFixed(2),
    );
  }, [visualOverrides?.forceMarginPercentage, flooredMaxAmount]);

  const sliderPercentage = useMemo(() => {
    if (visualOverrides?.forceMarginPercentage !== undefined) {
      return visualOverrides.forceMarginPercentage;
    }
    if (flooredMaxAmount <= 0) {
      return 0;
    }
    return Math.min(100, (marginAmount / flooredMaxAmount) * 100);
  }, [visualOverrides?.forceMarginPercentage, flooredMaxAmount, marginAmount]);

  const isInputFocusedEffective =
    visualOverrides?.forceInputFocused ?? isInputFocused;
  const isAdjusting = visualOverrides?.forceIsAdjusting ?? isAdjustingLive;

  const validationErrors = useMemo(() => {
    if (visualOverrides?.forceVisibleErrors) {
      return visualOverrides.forceVisibleErrors;
    }
    // Skip under keypad / forced visual presets so messages don't flicker
    if (isInputFocusedEffective || visualOverrides) {
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
  }, [
    visualOverrides,
    isInputFocusedEffective,
    marginAmount,
    flooredMaxAmount,
    isAddMode,
  ]);

  const amountHasError =
    visualOverrides?.forceAmountHasError ?? validationErrors.length > 0;

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
      if (visualOverrides) {
        return;
      }
      const amount = (flooredMaxAmount * percentage) / 100;
      setMarginAmountString(floorUsd(amount).toFixed(2));
    },
    [flooredMaxAmount, visualOverrides],
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
    if (marginAmount <= 0 || !position || visualOverrides) return;

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
    visualOverrides,
  ]);

  // Show error if no position found (either from route or live data)
  if ((!routePosition && !position) || !mode) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text variant={TextVariant.BodyMd} color={TextColor.ErrorDefault}>
            {strings('perps.errors.position_not_found')}
          </Text>
        </View>
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
    (visualOverrides?.forceConfirmDisabled ?? false) ||
    Boolean(validationErrors.length);

  const renderTransitionValue = (
    currentDisplay: string,
    nextDisplay: string,
    testID: string,
  ) =>
    showTransition ? (
      <View style={styles.changeContainer}>
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
      </View>
    ) : (
      <Text variant={TextVariant.BodyMd} testID={testID}>
        {currentDisplay}
      </Text>
    );

  const Summary = (
    <View style={styles.summaryContainer}>
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
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <HeaderStandard
        includesTopInset
        title={title}
        onBack={() => navigation.goBack()}
        endAccessory={__DEV__ ? renderFlask() : undefined}
      />

      <ScrollView
        style={styles.content}
        alwaysBounceVertical={false}
        contentContainerStyle={[
          styles.scrollViewContent,
          isInputFocusedEffective && styles.scrollViewContentWithKeypad,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <PerpsAmountDisplay
          label={
            isAddMode
              ? strings('perps.adjust_margin.select_amount_to_add')
              : strings('perps.adjust_margin.select_amount_to_remove')
          }
          amount={marginAmountString}
          onPress={handleAmountPress}
          isActive={isInputFocusedEffective}
          hasError={amountHasError}
          isLoading={isLoading}
          showMaxAmount={false}
        />

        {!isInputFocusedEffective && (
          <View style={styles.sliderSection}>
            <Slider
              value={sliderPercentage}
              onValueChange={handleSliderChange}
              minimumValue={0}
              maximumValue={100}
              step={1}
              showRangeLabels
              showRangeDots
              isDisabled={isAdjusting || Boolean(visualOverrides)}
              onGrip={handleSliderGrip}
              onMark={handleSliderMark}
              testID="mock-margin-slider"
            />
          </View>
        )}

        {validationErrors.map((error, index) => (
          <HelpText
            key={`error-${index}`}
            severity={HelpTextSeverity.Danger}
            twClassName="w-full justify-center text-center px-4"
          >
            {error}
          </HelpText>
        ))}
      </ScrollView>

      {isInputFocusedEffective && (
        <View style={styles.bottomSection}>
          {Summary}
          <View style={styles.percentageButtonsContainer}>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Md}
              onPress={() => handlePercentagePress(0.25)}
              style={styles.percentageButton}
            >
              25%
            </Button>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Md}
              onPress={() => handlePercentagePress(0.5)}
              style={styles.percentageButton}
            >
              50%
            </Button>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Md}
              onPress={handleMaxPress}
              style={styles.percentageButton}
            >
              {strings('perps.deposit.max_button')}
            </Button>
            <Button
              testID={PerpsAdjustMarginViewSelectorsIDs.DONE_BUTTON}
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Md}
              onPress={handleDonePress}
              style={styles.percentageButton}
            >
              {strings('perps.deposit.done_button')}
            </Button>
          </View>

          <Keypad
            value={marginAmountString}
            onChange={handleKeypadChange}
            currency="USD"
            decimals={2}
            style={styles.keypad}
          />
        </View>
      )}

      <View style={[styles.footer, styles.footerWithSummary]}>
        {!isInputFocusedEffective && Summary}
        {!isInputFocusedEffective && (
          <View style={styles.footerButton}>
            <Button
              testID={PerpsAdjustMarginViewSelectorsIDs.CONFIRM_BUTTON}
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={handleConfirm}
              isDisabled={isConfirmDisabled}
              isLoading={isAdjusting}
            >
              {buttonLabel}
            </Button>
          </View>
        )}
      </View>

      {selectedTooltip && !visualOverrides && (
        <PerpsBottomSheetTooltip
          isVisible
          onClose={handleTooltipClose}
          contentKey={selectedTooltip}
          key={selectedTooltip}
        />
      )}

      {visualStateSheet}
    </SafeAreaView>
  );
};

export default PerpsAdjustMarginView;
