import React, { memo, useCallback, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import {
  BannerAlert,
  BannerAlertSeverity,
  BannerBaseActionButtonLayout,
  IconName,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { PerpsStopLossPromptSelectorsIDs } from '../../Perps.testIds';
import {
  formatPerpsFiat,
  PRICE_RANGES_UNIVERSAL,
} from '../../utils/formatUtils';
import type { PerpsStopLossPromptBannerProps } from './PerpsStopLossPromptBanner.types';

/** Delay before fade-out starts, allowing user to see success checkmark */
const SUCCESS_DISPLAY_DELAY_MS = 2000;
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
      // Animation value for fade-out effect
      const fadeAnim = useRef(new Animated.Value(1)).current;

      // Reset opacity when isSuccess transitions to false (e.g., market change during animation)
      // This ensures the banner is visible when shown for a new market
      useEffect(() => {
        if (!isSuccess) {
          fadeAnim.setValue(1);
        }
      }, [isSuccess, fadeAnim]);

      // Trigger fade-out animation when isSuccess becomes true
      // Wait for SUCCESS_DISPLAY_DELAY_MS first so user sees success checkmark
      useEffect(() => {
        if (isSuccess) {
          const delayTimer = setTimeout(() => {
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: FADE_OUT_DURATION_MS,
              useNativeDriver: true,
            }).start(() => {
              // Call callback when animation completes
              onFadeOutComplete?.();
            });
          }, SUCCESS_DISPLAY_DELAY_MS);

          return () => clearTimeout(delayTimer);
        }
        return undefined;
      }, [isSuccess, fadeAnim, onFadeOutComplete]);

      // Safe press handlers that won't trigger if callback is not provided
      const handleAddMarginPress = useCallback(() => {
        onAddMargin?.();
      }, [onAddMargin]);

      // Button press handler - directly triggers stop loss action
      const handleSetStopLossPress = useCallback(() => {
        if (!isLoading && !isSuccess) {
          onSetStopLoss?.();
        }
      }, [isLoading, isSuccess, onSetStopLoss]);

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

      const isAddMargin = variant === 'add_margin';

      return (
        <Animated.View style={{ opacity: fadeAnim }}>
          <BannerAlert
            severity={BannerAlertSeverity.Neutral}
            startAccessory={undefined}
            title={
              isAddMargin
                ? strings('perps.stop_loss_prompt.near_liquidation_title', {
                    distance: roundedDistance,
                  })
                : strings('perps.stop_loss_prompt.protect_losses_title')
            }
            description={
              isAddMargin
                ? strings('perps.stop_loss_prompt.near_liquidation_subtitle')
                : strings('perps.stop_loss_prompt.set_stop_loss_subtitle', {
                    price: formattedStopLossPrice,
                    percent: formattedPercent,
                  })
            }
            actionButtonLayout={BannerBaseActionButtonLayout.End}
            actionButtonLabel={
              isSuccess
                ? ''
                : isAddMargin
                  ? strings('perps.stop_loss_prompt.add_margin_button')
                  : strings('perps.stop_loss_prompt.set_button')
            }
            actionButtonOnPress={
              isAddMargin ? handleAddMarginPress : handleSetStopLossPress
            }
            actionButtonProps={{
              testID: isAddMargin
                ? PerpsStopLossPromptSelectorsIDs.ADD_MARGIN_BUTTON
                : PerpsStopLossPromptSelectorsIDs.SET_STOP_LOSS_BUTTON,
              isLoading,
              isDisabled: isAddMargin
                ? isLoading || !onAddMargin
                : isLoading || isSuccess || !onSetStopLoss,
              ...(isSuccess
                ? {
                    startIconName: IconName.Check,
                    startIconProps: {
                      testID: PerpsStopLossPromptSelectorsIDs.SUCCESS_ICON,
                    },
                  }
                : {}),
            }}
            testID={testID}
          />
        </Animated.View>
      );
    },
  );

PerpsStopLossPromptBanner.displayName = 'PerpsStopLossPromptBanner';

export default PerpsStopLossPromptBanner;
