import React, { useState, useCallback, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
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
import Slider from '@react-native-community/slider';
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
import {
  assessMarginRemovalRisk,
  calculateMaxRemovableMargin,
  calculateNewLiquidationPrice,
} from '../../utils/marginUtils';

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

  const currentLeverage = useMemo(
    () => position?.leverage?.value || 1,
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

  const newLeverage = useMemo(() => {
    if (newMargin === 0) return currentLeverage;
    const positionValue = positionSize * entryPrice;
    return positionValue / newMargin;
  }, [newMargin, positionSize, entryPrice, currentLeverage]);

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

  // Risk assessment (only for remove mode)
  const liquidationRisk = useMemo(() => {
    if (isAddMode) return 'safe';
    const { riskLevel } = assessMarginRemovalRisk({
      newLiquidationPrice,
      currentPrice,
      isLong,
    });
    return riskLevel;
  }, [isAddMode, newLiquidationPrice, currentPrice, isLong]);

  const handleSliderChange = useCallback((value: number) => {
    setMarginAmount(value);
  }, []);

  const handleMaxPress = useCallback(() => {
    setMarginAmount(maxAmount);
  }, [maxAmount]);

  const handleConfirm = useCallback(async () => {
    if (marginAmount <= 0 || !position) return;
    if (isAddMode) {
      await handleAddMargin(position.coin, marginAmount);
    } else {
      await handleRemoveMargin(position.coin, marginAmount);
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

  const availableLabel = isAddMode
    ? strings('perps.adjust_margin.available_to_add')
    : strings('perps.adjust_margin.available_to_withdraw');

  const amountLabel = isAddMode
    ? strings('perps.adjust_margin.amount_to_add')
    : strings('perps.adjust_margin.amount_to_remove');

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
        {/* Current Position Info */}
        <View style={styles.section}>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('perps.adjust_margin.current_margin')}
              </Text>
              <Text variant={TextVariant.BodyMDBold}>
                ${currentMargin.toFixed(2)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {availableLabel}
              </Text>
              <Text variant={TextVariant.BodyMDBold}>
                ${maxAmount.toFixed(2)}
              </Text>
            </View>
            {isAddMode && (
              <View style={styles.infoRow}>
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Alternative}
                >
                  {strings('perps.adjust_margin.current_liquidation_price')}
                </Text>
                <Text variant={TextVariant.BodyMDBold}>
                  ${currentLiquidationPrice.toFixed(2)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Margin Amount Selector */}
        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text variant={TextVariant.BodyMDBold}>{amountLabel}</Text>
            <TouchableOpacity onPress={handleMaxPress} style={styles.maxButton}>
              <Text variant={TextVariant.BodySMBold} color={TextColor.Primary}>
                {strings('perps.adjust_margin.max')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.amountDisplay}>
            <Text variant={TextVariant.HeadingLG}>
              ${marginAmount.toFixed(2)}
            </Text>
          </View>

          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={maxAmount}
            value={marginAmount}
            onValueChange={handleSliderChange}
            minimumTrackTintColor={colors.primary.default}
            maximumTrackTintColor={colors.border.muted}
            thumbTintColor={colors.primary.default}
            step={0.01}
          />

          <View style={styles.sliderLabels}>
            <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
              $0
            </Text>
            <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
              ${maxAmount.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Impact Preview */}
        {marginAmount > 0 && (
          <View style={styles.section}>
            <View
              style={[
                styles.impactCard,
                !isAddMode &&
                  liquidationRisk === 'danger' &&
                  styles.impactCardDanger,
                !isAddMode &&
                  liquidationRisk === 'warning' &&
                  styles.impactCardWarning,
              ]}
            >
              <View style={styles.impactHeader}>
                <Icon
                  name={IconName.Info}
                  size={IconSize.Md}
                  color={
                    !isAddMode && liquidationRisk === 'danger'
                      ? colors.error.default
                      : !isAddMode && liquidationRisk === 'warning'
                        ? colors.warning.default
                        : colors.icon.alternative
                  }
                />
                <Text
                  variant={TextVariant.BodyMDBold}
                  style={styles.impactTitle}
                >
                  {strings('perps.adjust_margin.impact')}
                </Text>
              </View>

              <View style={styles.impactRow}>
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Alternative}
                >
                  {strings('perps.adjust_margin.new_margin')}
                </Text>
                <Text variant={TextVariant.BodyMDBold}>
                  ${newMargin.toFixed(2)}
                </Text>
              </View>

              <View style={styles.impactRow}>
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Alternative}
                >
                  {strings('perps.adjust_margin.new_leverage')}
                </Text>
                <View style={styles.changeContainer}>
                  <Text
                    variant={TextVariant.BodyMD}
                    color={TextColor.Alternative}
                    style={styles.strikethrough}
                  >
                    {currentLeverage.toFixed(2)}x
                  </Text>
                  <Icon
                    name={IconName.Arrow2Right}
                    size={IconSize.Sm}
                    color={colors.icon.alternative}
                  />
                  <Text
                    variant={TextVariant.BodyMDBold}
                    color={
                      isAddMode
                        ? TextColor.Success
                        : liquidationRisk === 'danger'
                          ? TextColor.Error
                          : liquidationRisk === 'warning'
                            ? TextColor.Warning
                            : TextColor.Default
                    }
                  >
                    {newLeverage.toFixed(2)}x
                  </Text>
                </View>
              </View>

              <View style={styles.impactRow}>
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Alternative}
                >
                  {strings('perps.adjust_margin.new_liquidation_price')}
                </Text>
                <View style={styles.changeContainer}>
                  <Text
                    variant={TextVariant.BodyMD}
                    color={TextColor.Alternative}
                    style={styles.strikethrough}
                  >
                    ${currentLiquidationPrice.toFixed(2)}
                  </Text>
                  <Icon
                    name={IconName.Arrow2Right}
                    size={IconSize.Sm}
                    color={colors.icon.alternative}
                  />
                  <Text
                    variant={TextVariant.BodyMDBold}
                    color={
                      isAddMode
                        ? TextColor.Success
                        : liquidationRisk === 'danger'
                          ? TextColor.Error
                          : liquidationRisk === 'warning'
                            ? TextColor.Warning
                            : TextColor.Default
                    }
                  >
                    ${newLiquidationPrice.toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Warnings */}
        {marginAmount > 0 && (
          <>
            {/* Low amount warning for add mode */}
            {isAddMode && marginAmount < 1 && (
              <View style={styles.section}>
                <View style={styles.warningCard}>
                  <Icon
                    name={IconName.Warning}
                    size={IconSize.Md}
                    color={colors.warning.default}
                  />
                  <Text variant={TextVariant.BodySM} style={styles.warningText}>
                    {strings('perps.adjust_margin.low_amount_warning')}
                  </Text>
                </View>
              </View>
            )}

            {/* Risk warning for remove mode */}
            {!isAddMode && liquidationRisk !== 'safe' && (
              <View style={styles.section}>
                <View
                  style={[
                    styles.warningCard,
                    liquidationRisk === 'danger' && styles.warningCardDanger,
                  ]}
                >
                  <Icon
                    name={IconName.Danger}
                    size={IconSize.Md}
                    color={
                      liquidationRisk === 'danger'
                        ? colors.error.default
                        : colors.warning.default
                    }
                  />
                  <View style={styles.warningTextContainer}>
                    <Text
                      variant={TextVariant.BodyMDBold}
                      color={
                        liquidationRisk === 'danger'
                          ? TextColor.Error
                          : TextColor.Warning
                      }
                    >
                      {liquidationRisk === 'danger'
                        ? strings('perps.adjust_margin.danger_title')
                        : strings('perps.adjust_margin.warning_title')}
                    </Text>
                    <Text variant={TextVariant.BodySM}>
                      {liquidationRisk === 'danger'
                        ? strings('perps.adjust_margin.danger_message')
                        : strings('perps.adjust_margin.warning_message')}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Footer Actions */}
      <View style={styles.footer}>
        <Button
          variant={
            !isAddMode && liquidationRisk === 'danger'
              ? ButtonVariants.Secondary
              : ButtonVariants.Primary
          }
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          label={strings('perps.adjust_margin.confirm')}
          onPress={handleConfirm}
          isDisabled={marginAmount <= 0 || isAdjusting}
          isLoading={isAdjusting}
        />
      </View>
    </SafeAreaView>
  );
};

export default PerpsAdjustMarginView;
