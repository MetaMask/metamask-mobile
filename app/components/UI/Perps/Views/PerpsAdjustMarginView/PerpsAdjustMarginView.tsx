import React, { useState, useCallback, useMemo } from 'react';
import { View, ScrollView } from 'react-native';
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
import { usePerpsLiveAccount, usePerpsLivePrices } from '../../hooks/stream';
import type { Position } from '../../controllers/types';
import styleSheet from './PerpsAdjustMarginView.styles';
import { useTheme } from '../../../../../util/theme';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import PerpsOrderHeader from '../../components/PerpsOrderHeader';
import { usePerpsMarginAdjustment } from '../../hooks/usePerpsMarginAdjustment';
import { usePerpsMeasurement } from '../../hooks/usePerpsMeasurement';
import { usePerpsMarkets } from '../../hooks/usePerpsMarkets';
import { TraceName } from '../../../../../util/trace';
import Logger from '../../../../../util/Logger';
import { ensureError } from '../../utils/perpsErrorHandler';
import {
  calculateMaxRemovableMargin,
  calculateNewLiquidationPrice,
} from '../../utils/marginUtils';
import PerpsAmountDisplay from '../../components/PerpsAmountDisplay';
import PerpsSlider from '../../components/PerpsSlider';
import {
  formatPerpsFiat,
  PRICE_RANGES_UNIVERSAL,
  PRICE_RANGES_MINIMAL_VIEW,
} from '../../utils/formatUtils';

interface AdjustMarginRouteParams {
  position: Position;
  mode: 'add' | 'remove';
}

const PerpsAdjustMarginView: React.FC = () => {
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<{ params: AdjustMarginRouteParams }, 'params'>>();
  const { position, mode } = route.params || {};
  const { styles } = useStyles(styleSheet, {});
  const { colors } = useTheme();
  const { account } = usePerpsLiveAccount();

  const [marginAmount, setMarginAmount] = useState(0);

  const isAddMode = mode === 'add';

  // Use margin adjustment hook for handling margin operations
  const { handleAddMargin, handleRemoveMargin, isAdjusting } =
    usePerpsMarginAdjustment({
      onSuccess: () => navigation.goBack(),
    });

  // Get market info for max leverage (needed for remove mode)
  const { markets } = usePerpsMarkets();
  const marketInfo = useMemo(
    () =>
      position?.coin ? markets.find((m) => m.coin === position.coin) : null,
    [position?.coin, markets],
  );
  const maxLeverage = marketInfo?.maxLeverage || 50;

  // Add performance measurement for this view
  usePerpsMeasurement({
    traceName: TraceName.PerpsAdjustMarginView,
    conditions: [!isAdjusting, !!position],
    tags: { mode },
  });

  // Get live prices for the header
  const livePrices = usePerpsLivePrices({
    symbols: position?.coin ? [position.coin] : [],
    throttleMs: 1000,
  });
  const currentPrice = useMemo(
    () => parseFloat(livePrices?.[position?.coin]?.price || '0'),
    [livePrices, position?.coin],
  );
  const priceChange = useMemo(
    () => parseFloat(livePrices?.[position?.coin]?.percentChange24h || '0'),
    [livePrices, position?.coin],
  );

  // Current position data
  const currentMargin = useMemo(
    () => parseFloat(position?.marginUsed || '0'),
    [position],
  );

  const currentLiquidationPrice = useMemo(
    () => parseFloat(position?.liquidationPrice || '0'),
    [position],
  );

  const positionSize = useMemo(
    () => Math.abs(parseFloat(position?.size || '0')),
    [position],
  );

  const entryPrice = useMemo(
    () => parseFloat(position?.entryPrice || '0'),
    [position],
  );

  const isLong = useMemo(
    () => parseFloat(position?.size || '0') > 0,
    [position],
  );

  // Available balance for add mode
  const availableBalance = useMemo(
    () => parseFloat(account?.availableBalance || '0'),
    [account],
  );

  // Calculate maximum amount based on mode
  const maxAmount = useMemo(() => {
    if (isAddMode) {
      return Math.max(0, availableBalance);
    }
    return calculateMaxRemovableMargin({
      currentMargin,
      positionSize,
      entryPrice,
      maxLeverage,
    });
  }, [
    isAddMode,
    availableBalance,
    currentMargin,
    positionSize,
    entryPrice,
    maxLeverage,
  ]);

  // Calculate new values after adjustment
  const newMargin = useMemo(() => {
    if (isAddMode) {
      return currentMargin + marginAmount;
    }
    return Math.max(0, currentMargin - marginAmount);
  }, [isAddMode, currentMargin, marginAmount]);

  // Calculate new liquidation price
  const newLiquidationPrice = useMemo(() => {
    if (newMargin === 0 || positionSize === 0) return currentLiquidationPrice;

    // For add mode, use simplified calculation
    if (isAddMode) {
      const marginPerUnit = newMargin / positionSize;
      if (isLong) {
        return Math.max(0, entryPrice - marginPerUnit);
      }
      return entryPrice + marginPerUnit;
    }

    // For remove mode, use utility function
    return calculateNewLiquidationPrice({
      newMargin,
      positionSize,
      entryPrice,
      isLong,
      currentLiquidationPrice,
    });
  }, [
    isAddMode,
    newMargin,
    positionSize,
    entryPrice,
    isLong,
    currentLiquidationPrice,
  ]);

  // Calculate liquidation distance percentage
  const calculateLiquidationDistance = useCallback(
    (liquidationPrice: number) => {
      if (currentPrice === 0 || !currentPrice || liquidationPrice === 0) {
        return 0;
      }
      const percentageDistance =
        (Math.abs(currentPrice - liquidationPrice) / currentPrice) * 100;
      return percentageDistance >= 99.9 ? 100 : percentageDistance;
    },
    [currentPrice],
  );

  const currentLiquidationDistance = useMemo(
    () => calculateLiquidationDistance(currentLiquidationPrice),
    [calculateLiquidationDistance, currentLiquidationPrice],
  );

  const newLiquidationDistance = useMemo(
    () => calculateLiquidationDistance(newLiquidationPrice),
    [calculateLiquidationDistance, newLiquidationPrice],
  );

  const handleSliderChange = useCallback((value: number) => {
    setMarginAmount(value);
  }, []);

  const handleMaxPress = useCallback(() => {
    setMarginAmount(maxAmount);
  }, [maxAmount]);

  const handleConfirm = useCallback(async () => {
    if (marginAmount <= 0 || !position) return;

    try {
      if (isAddMode) {
        await handleAddMargin(position.coin, marginAmount);
      } else {
        await handleRemoveMargin(position.coin, marginAmount);
      }
    } catch (error) {
      Logger.error(
        ensureError(error),
        `Failed to ${isAddMode ? 'add' : 'remove'} margin for ${position.coin}`,
      );
      // Note: Toast notification is handled by usePerpsMarginAdjustment hook
    }
  }, [marginAmount, position, isAddMode, handleAddMargin, handleRemoveMargin]);

  if (!position || !mode) {
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

  return (
    <SafeAreaView style={styles.container}>
      <PerpsOrderHeader
        asset={position.coin}
        price={currentPrice}
        priceChange={priceChange}
        title={title}
        isLoading={isAdjusting}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Amount Display */}
        <View style={styles.amountSection}>
          <PerpsAmountDisplay
            amount={marginAmount.toFixed(2)}
            onPress={handleMaxPress}
            isActive={false}
            hasError={false}
            isLoading={false}
          />
        </View>

        {/* Slider */}
        <View style={styles.sliderSection}>
          <PerpsSlider
            value={marginAmount}
            onValueChange={handleSliderChange}
            minimumValue={0}
            maximumValue={maxAmount}
            step={0.01}
            showPercentageLabels
            disabled={false}
          />
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          {/* First row: Perps balance or Margin in position */}
          <View style={styles.infoRow}>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {isAddMode
                ? strings('perps.adjust_margin.perps_balance')
                : strings('perps.adjust_margin.margin_in_position')}
            </Text>
            <Text variant={TextVariant.BodyMD}>
              {formatPerpsFiat(isAddMode ? availableBalance : currentMargin, {
                ranges: PRICE_RANGES_MINIMAL_VIEW,
              })}
            </Text>
          </View>

          {/* Second row: Liquidation price with transition */}
          <View style={styles.infoRow}>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('perps.adjust_margin.liquidation_price')}
            </Text>
            {marginAmount > 0 ? (
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
                  {formatPerpsFiat(newLiquidationPrice, {
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

          {/* Third row: Liquidation distance with transition */}
          <View style={styles.infoRow}>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('perps.adjust_margin.liquidation_distance')}
            </Text>
            {marginAmount > 0 ? (
              <View style={styles.changeContainer}>
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Alternative}
                >
                  {currentLiquidationDistance.toFixed(0)}%
                </Text>
                <Icon
                  name={IconName.Arrow2Right}
                  size={IconSize.Sm}
                  color={colors.icon.alternative}
                />
                <Text variant={TextVariant.BodyMD}>
                  {newLiquidationDistance.toFixed(0)}%
                </Text>
              </View>
            ) : (
              <Text variant={TextVariant.BodyMD}>
                {currentLiquidationDistance.toFixed(0)}%
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Footer Actions */}
      <View style={styles.footer}>
        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          label={buttonLabel}
          onPress={handleConfirm}
          isDisabled={marginAmount <= 0 || isAdjusting}
          isLoading={isAdjusting}
        />
      </View>
    </SafeAreaView>
  );
};

export default PerpsAdjustMarginView;
