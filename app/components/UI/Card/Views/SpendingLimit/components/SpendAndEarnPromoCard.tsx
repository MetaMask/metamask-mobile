import React, { useMemo } from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import ShimmerOverlay from './ShimmerOverlay';

export interface SpendAndEarnPromoCardProps {
  apyPercent?: number;
  cashbackPercent: number;
  onPress: () => void;
  testID?: string;
  accessibilityLabel?: string;
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
 * Renders a title, a single-paragraph description that embeds the current APY
 * and mUSD cashback rate, and a dedicated primary CTA. The whole card is
 * pressable; the CTA has a pronounced horizontal shimmer to draw the eye.
 */
const SpendAndEarnPromoCard: React.FC<SpendAndEarnPromoCardProps> = ({
  apyPercent,
  cashbackPercent,
  onPress,
  testID = 'use-money-account-cta',
  accessibilityLabel,
}) => {
  const tw = useTailwind();

  const description = useMemo(
    () =>
      apyPercent !== undefined
        ? strings('card.card_spending_limit.spend_and_earn_description', {
            apy: apyPercent,
            cashback: cashbackPercent,
          })
        : strings(
            'card.card_spending_limit.spend_and_earn_description_no_apy',
            { cashback: cashbackPercent },
          ),
    [apyPercent, cashbackPercent],
  );

  const resolvedAccessibilityLabel =
    accessibilityLabel ??
    strings('card.card_spending_limit.use_money_account_cta');

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={resolvedAccessibilityLabel}
      testID={testID}
      activeOpacity={0.85}
      style={tw.style('mb-6')}
    >
      <Box twClassName="p-4 rounded-2xl bg-background-muted gap-3">
        <Box twClassName="gap-1">
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-text-default font-medium"
          >
            {strings('card.card_spending_limit.spend_and_earn_title')}
          </Text>
          <Text variant={TextVariant.BodySm} twClassName="text-text-default">
            {description}
          </Text>
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
              onPress={onPress}
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
