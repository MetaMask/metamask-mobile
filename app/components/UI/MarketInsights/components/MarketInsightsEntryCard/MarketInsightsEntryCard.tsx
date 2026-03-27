import React, { useCallback, useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  IconColor,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import AiSVG from '../../../../../component-library/components/Icons/Icon/assets/ai.svg';
import { strings } from '../../../../../../locales/i18n';
import type { MarketInsightsEntryCardProps } from './MarketInsightsEntryCard.types';
import { endTrace, TraceName } from '../../../../../util/trace';
import { useViewportTracking } from '../../hooks/useViewportTracking';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import {
  EVENT_NAME,
  generateOpt,
} from '../../../../../core/Analytics/MetaMetrics.events';
import { AnimatedGradientBorder } from './AnimatedGradientBorder';
import { VISIBILITY_THRESHOLD } from './AnimatedGradientBorder.constants';

const SPARKLE_SIZE = 20;

const SparkleIcon: React.FC = () => {
  const tw = useTailwind();
  const { color } = tw.style(IconColor.IconAlternative);
  return (
    <AiSVG
      name="ai"
      width={SPARKLE_SIZE}
      height={SPARKLE_SIZE}
      fill={color as string}
    />
  );
};

/**
 * MarketInsightsEntryCard is the entry point card shown on the token details page.
 * Tapping navigates to the full Market Insights view.
 */
const MarketInsightsEntryCard: React.FC<MarketInsightsEntryCardProps> = ({
  report,
  timeAgo,
  onPress,
  caip19Id,
  testID,
}) => {
  const tw = useTailwind();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const [cardDimensions, setCardDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const [shouldAnimate, setShouldAnimate] = useState(false);

  const handleVisible = useCallback(() => {
    setShouldAnimate(true);

    if (!caip19Id) {
      return;
    }

    const event = createEventBuilder(
      generateOpt(EVENT_NAME.MARKET_INSIGHTS_CARD_SCROLLED_TO_VIEW),
    )
      .addProperties({
        caip19: caip19Id,
        asset_symbol: report.asset,
        digest_id: report.digestId,
      })
      .build();
    trackEvent(event);
  }, [trackEvent, createEventBuilder, caip19Id, report]);

  const { ref: cardRef, onLayout: onVisibilityLayout } = useViewportTracking(
    handleVisible,
    VISIBILITY_THRESHOLD,
  );

  useEffect(() => {
    if (caip19Id) {
      endTrace({
        name: TraceName.MarketInsightsEntryCardLoad,
        id: caip19Id,
      });
    }
  }, [caip19Id]);

  const handleLayout = useCallback(
    (event: { nativeEvent: { layout: { width: number; height: number } } }) => {
      const { width, height } = event.nativeEvent.layout;
      setCardDimensions((prev) => {
        if (prev && prev.width === width && prev.height === height) {
          return prev;
        }
        return { width, height };
      });
    },
    [],
  );

  return (
    <Pressable
      collapsable={false}
      ref={cardRef}
      onPress={onPress}
      onLayout={onVisibilityLayout}
      style={({ pressed }) =>
        tw.style('px-4 mt-2 mb-4', pressed && 'opacity-80')
      }
      testID={testID}
    >
      <Box
        twClassName="bg-background-muted rounded-2xl"
        padding={4}
        gap={3}
        onLayout={handleLayout}
      >
        <AnimatedGradientBorder
          dimensions={cardDimensions}
          shouldAnimate={shouldAnimate}
        />

        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextDefault}
          numberOfLines={3}
        >
          {report.summary}
        </Text>

        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={1}
        >
          <SparkleIcon />
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="flex-shrink"
          >
            {strings('market_insights.footer_disclaimer')}
            {' • '}
            {timeAgo}
          </Text>
        </Box>
      </Box>
    </Pressable>
  );
};

export default MarketInsightsEntryCard;
