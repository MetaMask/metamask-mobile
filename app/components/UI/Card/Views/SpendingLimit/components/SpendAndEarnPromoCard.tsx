import React, { useCallback, useEffect, useRef } from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import ShimmerOverlay from './ShimmerOverlay';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import {
  CardActions,
  CardEntryPoint,
  CardScreens,
} from '../../../util/metrics';

export interface SpendAndEarnPromoCardProps {
  apyPercent?: number;
  onPress: () => void;
  testID?: string;
  accessibilityLabel?: string;
  analytics?: {
    screen: CardScreens | string;
    entrypoint: CardEntryPoint;
    flow?: string;
  };
}

// Pronounced dark sweep that reads against the white Primary button surface.
// Multiple stops give the band a brighter center for a clearer "shine" effect.
const BUTTON_SHIMMER_COLORS = [
  'rgba(0,0,0,0)',
  'rgba(0,0,0,0.18)',
  'rgba(0,0,0,0.45)',
  'rgba(0,0,0,0.18)',
  'rgba(0,0,0,0)',
] as const;

const PRIMARY_BUTTON_RADIUS = 8;

/**
 * Promo card highlighting the Money account spend-and-earn benefit.
 *
 * Renders a title, description with a highlighted APY rate, and a dedicated
 * primary CTA. The whole card is pressable; the CTA has a pronounced horizontal
 * shimmer to draw the eye.
 */
const SpendAndEarnPromoCard: React.FC<SpendAndEarnPromoCardProps> = ({
  apyPercent,
  onPress,
  testID = 'use-money-account-cta',
  accessibilityLabel,
  analytics,
}) => {
  const tw = useTailwind();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const hasTrackedViewRef = useRef(false);

  const resolvedAccessibilityLabel =
    accessibilityLabel ??
    strings('card.card_spending_limit.use_money_account_cta');

  useEffect(() => {
    if (hasTrackedViewRef.current || !analytics) return;
    hasTrackedViewRef.current = true;

    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({
          screen: analytics.screen,
          entrypoint: analytics.entrypoint,
          flow: analytics.flow,
        })
        .build(),
    );
  }, [analytics, trackEvent, createEventBuilder]);

  const handlePress = useCallback(() => {
    if (analytics) {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties({
            screen: analytics.screen,
            entrypoint: analytics.entrypoint,
            flow: analytics.flow,
            action: CardActions.SPENDING_LIMIT_USE_MONEY_ACCOUNT_BUTTON,
          })
          .build(),
      );
    }

    onPress();
  }, [analytics, trackEvent, createEventBuilder, onPress]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={resolvedAccessibilityLabel}
      testID={testID}
      activeOpacity={0.85}
      style={tw.style('mb-6')}
    >
      <Box twClassName="p-4 rounded-2xl bg-background-muted gap-3">
        <Box twClassName="gap-1">
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Bold}>
            {strings('card.card_spending_limit.spend_and_earn_title')}
          </Text>
          {apyPercent !== undefined ? (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {strings(
                'card.card_spending_limit.spend_and_earn_description_prefix',
              )}
              <Text
                fontWeight={FontWeight.Medium}
                variant={TextVariant.BodySm}
                color={TextColor.SuccessDefault}
              >
                {strings(
                  'card.card_spending_limit.spend_and_earn_description_apy',
                  { apy: apyPercent },
                )}
              </Text>
              {strings(
                'card.card_spending_limit.spend_and_earn_description_suffix',
              )}
            </Text>
          ) : (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {strings(
                'card.card_spending_limit.spend_and_earn_description_no_apy',
              )}
            </Text>
          )}
        </Box>
        <Box twClassName="self-start">
          <ShimmerOverlay
            borderRadius={PRIMARY_BUTTON_RADIUS}
            colors={BUTTON_SHIMMER_COLORS}
            widthFraction={0.7}
            sweepDurationMs={1200}
            pauseDurationMs={6000}
            testID={`${testID}-shimmer`}
          >
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Sm}
              onPress={handlePress}
            >
              {strings('card.card_spending_limit.spend_and_earn_cta')}
            </Button>
          </ShimmerOverlay>
        </Box>
      </Box>
    </TouchableOpacity>
  );
};

export default SpendAndEarnPromoCard;
