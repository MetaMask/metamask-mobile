import React, { memo, useCallback, useEffect, useRef } from 'react';
import { View, Switch, ActivityIndicator, Animated } from 'react-native';
import { useStyles } from '../../../../../component-library/hooks';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonSize,
} from '../../../../../component-library/components/Buttons/Button';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import { PerpsStopLossPromptSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import {
  formatPerpsFiat,
  PRICE_RANGES_UNIVERSAL,
} from '../../utils/formatUtils';
import styleSheet from './PerpsStopLossPromptBanner.styles';
import type { PerpsStopLossPromptBannerProps } from './PerpsStopLossPromptBanner.types';

/** Duration of the fade-out animation in milliseconds */
const FADE_OUT_DURATION_MS = 300;

/**
 * PerpsStopLossPromptBanner
 *
 * A non-dismissible banner that prompts users to either:
 * - Add margin when close to liquidation (add_margin variant)
 * - Set a stop loss when ROE is significantly negative (stop_loss variant)
 *
 * Based on TAT-1693 (TASK_AUTOSET.md) specifications.
 *
 * @example
 * ```tsx
 * // Add Margin variant
 * <PerpsStopLossPromptBanner
 *   variant="add_margin"
 *   liquidationDistance={2.5}
 *   onAddMargin={() => navigateToAddMargin()}
 * />
 *
 * // Stop Loss variant
 * <PerpsStopLossPromptBanner
 *   variant="stop_loss"
 *   liquidationDistance={15}
 *   suggestedStopLossPrice="45000"
 *   suggestedStopLossPercent={-50}
 *   onSetStopLoss={handleSetStopLoss}
 * />
 * ```
 */
const PerpsStopLossPromptBanner: React.FC<PerpsStopLossPromptBannerProps> =
  memo(
    ({
      variant,
      liquidationDistance,
      suggestedStopLossPrice,
      suggestedStopLossPercent,
      onSetStopLoss,
      onAddMargin,
      isLoading = false,
      isSuccess = false,
      onFadeOutComplete,
      testID = PerpsStopLossPromptSelectorsIDs.CONTAINER,
    }) => {
      const { styles } = useStyles(styleSheet, {});
      const { colors } = useTheme();

      // Animation value for fade-out effect
      const fadeAnim = useRef(new Animated.Value(1)).current;

      // Trigger fade-out animation when isSuccess becomes true
      useEffect(() => {
        if (isSuccess) {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: FADE_OUT_DURATION_MS,
            useNativeDriver: true,
          }).start(() => {
            // Call callback when animation completes
            onFadeOutComplete?.();
          });
        }
      }, [isSuccess, fadeAnim, onFadeOutComplete]);

      // Safe press handlers that won't trigger if callback is not provided
      const handleAddMarginPress = useCallback(() => {
        onAddMargin?.();
      }, [onAddMargin]);

      // Toggle handler - directly triggers stop loss action
      const handleToggleChange = useCallback(
        (value: boolean) => {
          if (value && !isLoading) {
            onSetStopLoss?.();
          }
        },
        [isLoading, onSetStopLoss],
      );

      // Format the suggested stop loss price for display
      const formattedStopLossPrice = suggestedStopLossPrice
        ? formatPerpsFiat(parseFloat(suggestedStopLossPrice), {
            ranges: PRICE_RANGES_UNIVERSAL,
          })
        : '';

      // Format the percentage
      const formattedPercent =
        suggestedStopLossPercent !== undefined
          ? `${suggestedStopLossPercent >= 0 ? '+' : ''}${suggestedStopLossPercent.toFixed(0)}%`
          : '';

      // Round liquidation distance for display
      const roundedDistance = Math.round(liquidationDistance);

      if (variant === 'add_margin') {
        return (
          <Animated.View
            style={[styles.container, { opacity: fadeAnim }]}
            testID={testID}
          >
            <View style={styles.addMarginRow}>
              <View style={styles.addMarginTextContainer}>
                <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                  {strings('perps.stop_loss_prompt.near_liquidation_title', {
                    distance: roundedDistance,
                  })}
                </Text>
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                >
                  {strings('perps.stop_loss_prompt.near_liquidation_subtitle')}
                </Text>
              </View>
              <Button
                variant={ButtonVariants.Primary}
                size={ButtonSize.Sm}
                label={
                  isLoading ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.primary.inverse}
                    />
                  ) : (
                    strings('perps.stop_loss_prompt.add_margin_button')
                  )
                }
                onPress={handleAddMarginPress}
                isDisabled={isLoading || !onAddMargin}
                style={styles.button}
                testID={PerpsStopLossPromptSelectorsIDs.ADD_MARGIN_BUTTON}
              />
            </View>
          </Animated.View>
        );
      }

      // Stop Loss variant
      return (
        <Animated.View
          style={[styles.container, { opacity: fadeAnim }]}
          testID={testID}
        >
          <View style={styles.stopLossRow}>
            <View style={styles.stopLossTextContainer}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                {strings('perps.stop_loss_prompt.protect_losses_title')}
              </Text>
              <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
                {strings('perps.stop_loss_prompt.set_stop_loss_subtitle', {
                  price: formattedStopLossPrice,
                  percent: formattedPercent,
                })}
              </Text>
            </View>
            <View style={styles.toggleContainer}>
              {isLoading ? (
                <ActivityIndicator
                  size="small"
                  color={colors.primary.default}
                  testID={PerpsStopLossPromptSelectorsIDs.LOADING}
                />
              ) : (
                <Switch
                  value={false}
                  onValueChange={handleToggleChange}
                  trackColor={{
                    true: colors.primary.default,
                    false: colors.border.muted,
                  }}
                  thumbColor={colors.background.default}
                  ios_backgroundColor={colors.border.muted}
                  disabled={isLoading || !onSetStopLoss}
                  testID={PerpsStopLossPromptSelectorsIDs.TOGGLE}
                />
              )}
            </View>
          </View>
        </Animated.View>
      );
    },
  );

PerpsStopLossPromptBanner.displayName = 'PerpsStopLossPromptBanner';

export default PerpsStopLossPromptBanner;
