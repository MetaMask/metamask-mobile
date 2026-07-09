import React, { memo, useCallback, useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { useStyles } from '../../../../../component-library/hooks';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import {
  BannerAlert,
  BannerAlertSeverity,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { PerpsStopLossPromptSelectorsIDs } from '../../Perps.testIds';
import {
  formatPerpsFiat,
  PRICE_RANGES_UNIVERSAL,
} from '../../utils/formatUtils';
import styleSheet from './PerpsStopLossPromptBanner.styles';
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
      const { styles } = useStyles(styleSheet, {});

      const fadeAnim = useRef(new Animated.Value(1)).current;

      useEffect(() => {
        if (!isSuccess) {
          fadeAnim.setValue(1);
        }
      }, [isSuccess, fadeAnim]);

      useEffect(() => {
        if (isSuccess) {
          const delayTimer = setTimeout(() => {
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: FADE_OUT_DURATION_MS,
              useNativeDriver: true,
            }).start(() => {
              onFadeOutComplete?.();
            });
          }, SUCCESS_DISPLAY_DELAY_MS);

          return () => clearTimeout(delayTimer);
        }
        return undefined;
      }, [isSuccess, fadeAnim, onFadeOutComplete]);

      const handleAddMarginPress = useCallback(() => {
        onAddMargin?.();
      }, [onAddMargin]);

      const handleSetStopLossPress = useCallback(() => {
        if (!isLoading && !isSuccess) {
          onSetStopLoss?.();
        }
      }, [isLoading, isSuccess, onSetStopLoss]);

      const formattedStopLossPrice = suggestedStopLossPrice
        ? formatPerpsFiat(parseFloat(suggestedStopLossPrice), {
            ranges: PRICE_RANGES_UNIVERSAL,
          })
        : '';

      const formattedPercent =
        suggestedStopLossPercent !== undefined
          ? `${suggestedStopLossPercent >= 0 ? '+' : ''}${suggestedStopLossPercent.toFixed(0)}%`
          : '';

      const roundedDistance = Math.round(liquidationDistance);

      if (variant === 'add_margin') {
        return (
          <Animated.View style={{ opacity: fadeAnim }} testID={testID}>
            <Box twClassName="px-4">
              <BannerAlert
                severity={BannerAlertSeverity.Neutral}
                title={strings(
                  'perps.stop_loss_prompt.near_liquidation_title',
                  {
                    distance: roundedDistance,
                  },
                )}
                description={strings(
                  'perps.stop_loss_prompt.near_liquidation_subtitle',
                )}
              >
                <Box twClassName="mt-2">
                  <Button
                    variant={ButtonVariant.Primary}
                    size={ButtonSize.Md}
                    onPress={handleAddMarginPress}
                    isDisabled={isLoading || !onAddMargin}
                    isLoading={isLoading}
                    testID={PerpsStopLossPromptSelectorsIDs.ADD_MARGIN_BUTTON}
                  >
                    {strings('perps.stop_loss_prompt.add_margin_button')}
                  </Button>
                </Box>
              </BannerAlert>
            </Box>
          </Animated.View>
        );
      }

      return (
        <Animated.View style={{ opacity: fadeAnim }} testID={testID}>
          <Box twClassName="px-4">
            <View style={styles.stopLossCard}>
              <View style={styles.stopLossRow}>
                <View style={styles.stopLossTextContainer}>
                  <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                    {strings('perps.stop_loss_prompt.protect_losses_title')}
                  </Text>
                  <Text
                    variant={TextVariant.BodySM}
                    color={TextColor.Alternative}
                  >
                    {strings('perps.stop_loss_prompt.set_stop_loss_subtitle', {
                      price: formattedStopLossPrice,
                      percent: formattedPercent,
                    })}
                  </Text>
                </View>
                <Button
                  variant={ButtonVariant.Primary}
                  size={ButtonSize.Sm}
                  onPress={handleSetStopLossPress}
                  isDisabled={isLoading || isSuccess || !onSetStopLoss}
                  style={styles.button}
                  isLoading={isLoading}
                  testID={PerpsStopLossPromptSelectorsIDs.SET_STOP_LOSS_BUTTON}
                >
                  {isSuccess ? (
                    <Icon
                      name={IconName.Check}
                      size={IconSize.Sm}
                      color={IconColor.PrimaryInverse}
                      testID={PerpsStopLossPromptSelectorsIDs.SUCCESS_ICON}
                    />
                  ) : (
                    strings('perps.stop_loss_prompt.set_button')
                  )}
                </Button>
              </View>
            </View>
          </Box>
        </Animated.View>
      );
    },
  );

PerpsStopLossPromptBanner.displayName = 'PerpsStopLossPromptBanner';

export default PerpsStopLossPromptBanner;
