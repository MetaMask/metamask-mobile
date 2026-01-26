import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useStyles } from '../../../../../component-library/hooks';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../../../component-library/components/Buttons/Button';
import { strings } from '../../../../../../locales/i18n';
import type { Position } from '../../controllers/types';
import styleSheet from './PerpsAdjustMarginView.styles';
import { useTheme } from '../../../../../util/theme';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import { usePerpsMarginAdjustment } from '../../hooks/usePerpsMarginAdjustment';
import { usePerpsMeasurement } from '../../hooks/usePerpsMeasurement';
import { usePerpsAdjustMarginData } from '../../hooks/usePerpsAdjustMarginData';
import { TraceName } from '../../../../../util/trace';
import Logger from '../../../../../util/Logger';
import { ensureError } from '../../../../../util/errorUtils';
import PerpsAmountDisplay from '../../components/PerpsAmountDisplay';
import PerpsSlider from '../../components/PerpsSlider';
import PerpsBottomSheetTooltip from '../../components/PerpsBottomSheetTooltip';
import { PerpsTooltipContentKey } from '../../components/PerpsBottomSheetTooltip/PerpsBottomSheetTooltip.types';
import Keypad from '../../../../Base/Keypad';
import {
  formatPerpsFiat,
  PRICE_RANGES_UNIVERSAL,
  PRICE_RANGES_MINIMAL_VIEW,
} from '../../utils/formatUtils';
import { PERPS_CONSTANTS } from '../../constants/perpsConfig';

interface AdjustMarginRouteParams {
  position: Position;
  mode: 'add' | 'remove';
}

const PerpsAdjustMarginView: React.FC = () => {
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<{ params: AdjustMarginRouteParams }, 'params'>>();
  const { position: routePosition, mode } = route.params || {};
  const { styles } = useStyles(styleSheet, {});
  const { colors } = useTheme();

  const [marginAmountString, setMarginAmountString] = useState('0');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [selectedTooltip, setSelectedTooltip] =
    useState<PerpsTooltipContentKey | null>(null);

  // Refs to freeze display values during exit animation (avoids re-renders and race conditions)
  const submittedRef = useRef(false);
  const frozenValuesRef = useRef<{
    newLiquidationPrice: number;
    newLiquidationDistance: number;
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

  // Add performance measurement for this view
  usePerpsMeasurement({
    traceName: TraceName.PerpsAdjustMarginView,
    conditions: [!isAdjusting, !!position],
    debugContext: { mode },
  });

  const handleSliderChange = useCallback((value: number) => {
    // Floor to 2 decimal places to match Hyperliquid behavior
    const flooredValue = Math.floor(value * 100) / 100;
    setMarginAmountString(flooredValue.toFixed(2));
  }, []);

  const handleMaxPress = useCallback(() => {
    // Floor maxAmount to 2 decimal places
    const flooredMax = Math.floor(maxAmount * 100) / 100;
    setMarginAmountString(flooredMax.toFixed(2));
  }, [maxAmount]);

  // Keypad handlers
  const handleAmountPress = useCallback(() => {
    setIsInputFocused(true);
  }, []);

  const handleKeypadChange = useCallback(
    ({ value }: { value: string }) => {
      const numValue = parseFloat(value) || 0;
      // Clamp to maxAmount for remove mode to prevent invalid submissions
      const flooredMax = Math.floor(maxAmount * 100) / 100;
      if (!isAddMode && numValue > flooredMax) {
        setMarginAmountString(flooredMax.toFixed(2));
      } else {
        setMarginAmountString(value || '0');
      }
    },
    [isAddMode, maxAmount],
  );

  const handleDonePress = useCallback(() => {
    setIsInputFocused(false);
  }, []);

  const handlePercentagePress = useCallback(
    (percentage: number) => {
      // Floor the percentage result
      const amount = maxAmount * percentage;
      const flooredAmount = Math.floor(amount * 100) / 100;
      setMarginAmountString(flooredAmount.toFixed(2));
    },
    [maxAmount],
  );

  // Tooltip handlers
  const handleTooltipPress = useCallback(
    (contentKey: PerpsTooltipContentKey) => {
      setSelectedTooltip(contentKey);
    },
    [],
  );

  const handleTooltipClose = useCallback(() => {
    setSelectedTooltip(null);
  }, []);

  // Helper to format liquidation distance with fallback when liquidation price is unavailable
  const formatLiquidationDistance = useCallback(
    (distance: number, liquidationPrice: number): string => {
      if (liquidationPrice === 0) {
        return PERPS_CONSTANTS.FALLBACK_DATA_DISPLAY;
      }
      return `${distance.toFixed(0)}%`;
    },
    [],
  );

  const handleConfirm = useCallback(async () => {
    if (marginAmount <= 0 || !position) return;

    // Prevent submission if amount exceeds max removable (extra safety for remove mode)
    const flooredMax = Math.floor(maxAmount * 100) / 100;
    if (!isAddMode && marginAmount > flooredMax) {
      return;
    }

    // Freeze values using ref (no re-render) to prevent flickering during exit animation
    submittedRef.current = true;
    frozenValuesRef.current = {
      newLiquidationPrice,
      newLiquidationDistance,
    };

    try {
      if (isAddMode) {
        await handleAddMargin(position.symbol, marginAmount);
      } else {
        await handleRemoveMargin(position.symbol, marginAmount);
      }
    } catch (error) {
      // Unfreeze on error so user sees live values again
      submittedRef.current = false;
      frozenValuesRef.current = null;
      Logger.error(
        ensureError(error),
        `Failed to ${isAddMode ? 'add' : 'remove'} margin for ${position.symbol}`,
      );
      // Note: Toast notification is handled by usePerpsMarginAdjustment hook
    }
  }, [
    marginAmount,
    position,
    isAddMode,
    maxAmount,
    newLiquidationPrice,
    newLiquidationDistance,
    handleAddMargin,
    handleRemoveMargin,
  ]);

  // Show error if no position found (either from route or live data)
  if ((!routePosition && !position) || !mode) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Error}>
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

  // Floor maxAmount for display and comparison
  const flooredMaxAmount = Math.floor(maxAmount * 100) / 100;

  // Derive frozen values during render (no state, no re-render)
  const displayNewLiquidationPrice = submittedRef.current
    ? (frozenValuesRef.current?.newLiquidationPrice ?? newLiquidationPrice)
    : newLiquidationPrice;
  const displayNewLiquidationDistance = submittedRef.current
    ? (frozenValuesRef.current?.newLiquidationDistance ??
      newLiquidationDistance)
    : newLiquidationDistance;

  // Show transition view when there's input OR when submitted (frozen)
  const showTransition = marginAmount > 0 || submittedRef.current;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          onPress={() => navigation.goBack()}
          iconColor={IconColor.Default}
          size={ButtonIconSizes.Md}
        />
        <Text variant={TextVariant.HeadingMD} style={styles.headerTitle}>
          {title}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.contentContainer}>
        {/* Amount Display */}
        <View style={styles.amountSection}>
          <PerpsAmountDisplay
            amount={marginAmountString}
            onPress={handleAmountPress}
            isActive={isInputFocused}
            hasError={false}
            isLoading={isLoading}
          />
        </View>

        {/* Slider - Hide when keypad is active */}
        {!isInputFocused && (
          <View style={styles.sliderSection}>
            <PerpsSlider
              value={marginAmount}
              onValueChange={handleSliderChange}
              minimumValue={0}
              maximumValue={flooredMaxAmount}
              step={0.01}
              showPercentageLabels
              disabled={false}
            />
          </View>
        )}

        {/* Info Section - Always visible */}
        <View style={styles.infoSection}>
          {/* First row: Current margin */}
          <View style={styles.infoRow}>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('perps.adjust_margin.margin_in_position')}
            </Text>
            <Text variant={TextVariant.BodyMD}>
              {formatPerpsFiat(currentMargin, {
                ranges: PRICE_RANGES_MINIMAL_VIEW,
              })}
            </Text>
          </View>

          {/* Second row: Margin available to add/remove */}
          <View style={styles.infoRow}>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {isAddMode
                ? strings('perps.adjust_margin.margin_available_to_add')
                : strings('perps.adjust_margin.margin_available_to_remove')}
            </Text>
            <Text variant={TextVariant.BodyMD}>
              {formatPerpsFiat(flooredMaxAmount, {
                ranges: PRICE_RANGES_MINIMAL_VIEW,
              })}
            </Text>
          </View>

          {/* Third row: Liquidation price with transition */}
          <View style={styles.infoRow}>
            <View style={styles.labelWithIcon}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('perps.adjust_margin.liquidation_price')}
              </Text>
              <TouchableOpacity
                onPress={() => handleTooltipPress('liquidation_price')}
                style={styles.infoIcon}
              >
                <Icon
                  name={IconName.Info}
                  size={IconSize.Sm}
                  color={IconColor.Alternative}
                />
              </TouchableOpacity>
            </View>
            {showTransition ? (
              <View style={styles.changeContainer}>
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Alternative}
                >
                  {formatPerpsFiat(currentLiquidationPrice, {
                    ranges: PRICE_RANGES_UNIVERSAL,
                  })}
                </Text>
                <Icon
                  name={IconName.Arrow2Right}
                  size={IconSize.Sm}
                  color={colors.icon.alternative}
                />
                <Text variant={TextVariant.BodyMD}>
                  {formatPerpsFiat(displayNewLiquidationPrice, {
                    ranges: PRICE_RANGES_UNIVERSAL,
                  })}
                </Text>
              </View>
            ) : (
              <Text variant={TextVariant.BodyMD}>
                {formatPerpsFiat(currentLiquidationPrice, {
                  ranges: PRICE_RANGES_UNIVERSAL,
                })}
              </Text>
            )}
          </View>

          {/* Fourth row: Liquidation distance with transition */}
          <View style={styles.infoRow}>
            <View style={styles.labelWithIcon}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('perps.adjust_margin.liquidation_distance')}
              </Text>
              <TouchableOpacity
                onPress={() => handleTooltipPress('liquidation_distance')}
                style={styles.infoIcon}
              >
                <Icon
                  name={IconName.Info}
                  size={IconSize.Sm}
                  color={IconColor.Alternative}
                />
              </TouchableOpacity>
            </View>
            {showTransition ? (
              <View style={styles.changeContainer}>
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Alternative}
                >
                  {formatLiquidationDistance(
                    currentLiquidationDistance,
                    currentLiquidationPrice,
                  )}
                </Text>
                <Icon
                  name={IconName.Arrow2Right}
                  size={IconSize.Sm}
                  color={colors.icon.alternative}
                />
                <Text variant={TextVariant.BodyMD}>
                  {formatLiquidationDistance(
                    displayNewLiquidationDistance,
                    displayNewLiquidationPrice,
                  )}
                </Text>
              </View>
            ) : (
              <Text variant={TextVariant.BodyMD}>
                {formatLiquidationDistance(
                  currentLiquidationDistance,
                  currentLiquidationPrice,
                )}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Footer - Shows either Add Margin button or Keypad */}
      {!isInputFocused ? (
        <View style={styles.footer}>
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label={buttonLabel}
            onPress={handleConfirm}
            isDisabled={
              marginAmount <= 0 ||
              isAdjusting ||
              (!isAddMode && marginAmount > flooredMaxAmount)
            }
            loading={isAdjusting}
          />
        </View>
      ) : (
        <View style={styles.keypadFooter}>
          <View style={styles.percentageButtonsContainer}>
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Md}
              label="25%"
              onPress={() => handlePercentagePress(0.25)}
              style={styles.percentageButton}
            />
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Md}
              label="50%"
              onPress={() => handlePercentagePress(0.5)}
              style={styles.percentageButton}
            />
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Md}
              label={strings('perps.deposit.max_button')}
              onPress={handleMaxPress}
              style={styles.percentageButton}
            />
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Md}
              label={strings('perps.deposit.done_button')}
              onPress={handleDonePress}
              style={styles.percentageButton}
            />
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

      {/* Tooltip Bottom Sheet */}
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
