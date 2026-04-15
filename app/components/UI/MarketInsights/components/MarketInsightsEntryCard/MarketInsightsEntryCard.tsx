import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import MaskedView from '@react-native-masked-view/masked-view';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View, Pressable } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { strings } from '../../../../../../locales/i18n';
import AiSVG from '../../../../../component-library/components/Icons/Icon/assets/ai.svg';
import ArrowRightSVG from '../../../../../component-library/components/Icons/Icon/assets/arrow-right.svg';
import {
  EVENT_NAME,
  generateOpt,
} from '../../../../../core/Analytics/MetaMetrics.events';
import { endTrace, TraceName } from '../../../../../util/trace';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { useViewportTracking } from '../../hooks/useViewportTracking';
import { AnimatedGradientBorder } from './AnimatedGradientBorder';
import { VISIBILITY_THRESHOLD } from './AnimatedGradientBorder.constants';
import type { MarketInsightsEntryCardProps } from './MarketInsightsEntryCard.types';
import SlidingTextCarousel from './SlidingTextCarousel';
import {
  CHROME_GRADIENT_HEAD,
  CHROME_GRADIENT_LINEAR_END,
  CHROME_GRADIENT_LINEAR_START,
  CHROME_GRADIENT_TAIL,
} from './constants';

const ARROW_ICON_SIZE = 16;
const SPARKLE_SIZE = 20;

const styles = StyleSheet.create({
  gradientTextMask: {
    flexDirection: 'row',
  },
  gradient: {
    flexDirection: 'row',
  },
  gradientTextHidden: {
    opacity: 0,
  },
  sparkleGradient: {
    width: SPARKLE_SIZE,
    height: SPARKLE_SIZE,
  },
});

// ---------------------------------------------------------------------------
// Gradient helpers
// ---------------------------------------------------------------------------

interface GradientTextProps {
  children: string;
  variant: TextVariant;
  fontWeight?: FontWeight;
}

/** Renders text with a left-to-right gradient fill using MaskedView. */
const GradientText: React.FC<GradientTextProps> = ({
  children,
  variant,
  fontWeight,
}) => (
  <MaskedView
    maskElement={
      <Text variant={variant} fontWeight={fontWeight}>
        {children}
      </Text>
    }
    style={styles.gradientTextMask}
  >
    <LinearGradient
      colors={[CHROME_GRADIENT_HEAD, CHROME_GRADIENT_TAIL]}
      start={CHROME_GRADIENT_LINEAR_START}
      end={CHROME_GRADIENT_LINEAR_END}
      style={styles.gradient}
    >
      <Text
        variant={variant}
        fontWeight={fontWeight}
        style={styles.gradientTextHidden}
      >
        {children}
      </Text>
    </LinearGradient>
  </MaskedView>
);

/** Renders the AI sparkle SVG with a left-to-right gradient fill using MaskedView. */
const GradientSparkleIcon: React.FC = () => (
  <MaskedView
    maskElement={
      <AiSVG
        name="ai"
        width={SPARKLE_SIZE}
        height={SPARKLE_SIZE}
        fill="black"
      />
    }
  >
    <LinearGradient
      colors={[CHROME_GRADIENT_HEAD, CHROME_GRADIENT_TAIL]}
      start={CHROME_GRADIENT_LINEAR_START}
      end={CHROME_GRADIENT_LINEAR_END}
      style={styles.sparkleGradient}
    />
  </MaskedView>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * MarketInsightsEntryCard is the entry point card shown on the token details page.
 * Tapping navigates to the full Market Insights view.
 */
const MarketInsightsEntryCard: React.FC<MarketInsightsEntryCardProps> = ({
  report,
  timeAgo,
  onPress,
  onDisclaimerPress,
  caip19Id,
  testID,
}) => {
  const tw = useTailwind();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const [cardDimensions, setCardDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const [borderAnimationKey, setBorderAnimationKey] = useState(0);

  // Derive a stable key from actual text content so the memo doesn't bust
  // when the parent passes a new report object with identical data.
  const trendsKey = report.trends.map((t) => t.description).join('\0');
  const displayTexts = useMemo(() => {
    const descriptions = report.trends
      .map((t) => t.description)
      .filter(Boolean);
    return descriptions.length > 0 ? descriptions : [report.summary];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trendsKey, report.summary]);

  const handleDescriptionSlideStart = useCallback(() => {
    setBorderAnimationKey((k) => k + 1);
  }, []);

  const handleVisible = useCallback(() => {
    setBorderAnimationKey((k) => k + 1);

    if (!caip19Id) {
      return;
    }

    const digestId =
      'digestId' in report &&
      typeof (report as { digestId?: unknown }).digestId === 'string'
        ? (report as { digestId: string }).digestId
        : undefined;

    const event = createEventBuilder(
      generateOpt(EVENT_NAME.MARKET_INSIGHTS_CARD_SCROLLED_TO_VIEW),
    )
      .addProperties({
        caip19: caip19Id,
        asset_symbol: report.asset,
        ...(digestId !== undefined ? { digest_id: digestId } : {}),
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
    <>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={tw.style('px-4 mt-2 mb-4')}
        testID={testID}
      >
        <View ref={cardRef} collapsable={false} onLayout={onVisibilityLayout}>
          <Box
            twClassName="bg-background-muted rounded-xl"
            padding={4}
            gap={1}
            onLayout={handleLayout}
          >
            <AnimatedGradientBorder
              dimensions={cardDimensions}
              animationKey={borderAnimationKey}
            />

            {/* Title row */}
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={1}
            >
              <GradientText
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
              >
                {strings('market_insights.title')}
              </GradientText>
              <ArrowRightSVG
                name="arrow-right"
                width={ARROW_ICON_SIZE}
                height={ARROW_ICON_SIZE}
                fill={CHROME_GRADIENT_TAIL}
              />
            </Box>

            {/* Body text: rotating trend descriptions */}
            <SlidingTextCarousel
              texts={displayTexts}
              onSlideStart={handleDescriptionSlideStart}
            />

            {/* Footer disclaimer */}
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={1}
              twClassName="mt-0.5"
            >
              <GradientSparkleIcon />
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                twClassName="shrink"
              >
                {strings('market_insights.card_footer_disclaimer')}
                {' • '}
                {timeAgo}
              </Text>
              <Pressable
                testID="market-insights-info-button"
                onPress={onDisclaimerPress}
                hitSlop={8}
              >
                <Icon
                  name={IconName.Info}
                  size={IconSize.Sm}
                  color={IconColor.IconAlternative}
                />
              </Pressable>
            </Box>
          </Box>
        </View>
      </TouchableOpacity>
    </>
  );
};

export default MarketInsightsEntryCard;
