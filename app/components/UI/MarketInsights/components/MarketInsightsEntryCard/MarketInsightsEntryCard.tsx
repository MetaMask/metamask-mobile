import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import MaskedView from '@react-native-masked-view/masked-view';
import LinearGradient from 'react-native-linear-gradient';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import AiSVG from '../../../../../component-library/components/Icons/Icon/assets/ai.svg';
import ArrowRightSVG from '../../../../../component-library/components/Icons/Icon/assets/arrow-right.svg';
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

const GRADIENT_COLORS = ['#D86FCF', '#ED666E'] as const;
const GRADIENT_START = { x: 0, y: 0 };
const GRADIENT_END = { x: 1, y: 0 };
const ARROW_ICON_SIZE = 16;
const SPARKLE_SIZE = 16;
const SLIDE_DURATION_MS = 350;
const ROTATE_INTERVAL_MS = 5000;

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
  overflowHidden: {
    overflow: 'hidden',
  },
  slidingText: {
    position: 'absolute',
    left: 0,
    right: 0,
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
      colors={[...GRADIENT_COLORS]}
      start={GRADIENT_START}
      end={GRADIENT_END}
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
      colors={[...GRADIENT_COLORS]}
      start={GRADIENT_START}
      end={GRADIENT_END}
      style={styles.sparkleGradient}
    />
  </MaskedView>
);

// ---------------------------------------------------------------------------
// Sliding text carousel
// ---------------------------------------------------------------------------

interface SlidingTextCarouselProps {
  texts: string[];
  onSlideComplete?: () => void;
}

/**
 * Shows one text item at a time, sliding each one out to the left and bringing
 * the next in from the right every ROTATE_INTERVAL_MS milliseconds.
 * When there is only one item, it renders statically without animation.
 *
 * Uses a double-buffer approach: two slots (A and B) alternate roles between
 * "front" (visible, about to slide out) and "back" (off-screen right, about
 * to slide in). After each slide the departing slot is teleported off-screen
 * right and its text is refreshed while invisible — avoiding any flash.
 */
const SlidingTextCarousel: React.FC<SlidingTextCarouselProps> = ({
  texts,
  onSlideComplete,
}) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const isAnimating = useRef(false);

  // Each slot owns its text content directly — no index-based lookup during render
  const [slotAText, setSlotAText] = useState(texts[0] ?? '');
  const [slotBText, setSlotBText] = useState(texts[1] ?? texts[0] ?? '');

  // Slot A starts visible (x=0); slot B starts off-screen right (set after layout)
  const slotAX = useSharedValue(0);
  const slotBX = useSharedValue(0);

  // Track which slot is the current "front" (visible) and which text comes next
  const frontIsA = useRef(true);
  const upcomingIndex = useRef(2);

  useEffect(() => {
    if (containerWidth > 0) {
      slotBX.value = containerWidth;
    }
  }, [containerWidth, slotBX]);

  const slotAStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slotAX.value }],
  }));
  const slotBStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slotBX.value }],
  }));

  /**
   * Runs on the JS thread after a slide animation completes.
   * All ref mutations must happen here — worklet closures run on the UI thread
   * and writes to useRef objects there do not propagate back to the JS thread.
   */
  const onSlideEnd = useCallback(
    (wasAFront: boolean, capturedIdx: number) => {
      frontIsA.current = !wasAFront;
      const nextText = texts[capturedIdx % texts.length];
      if (wasAFront) {
        setSlotAText(nextText);
      } else {
        setSlotBText(nextText);
      }
      upcomingIndex.current = (capturedIdx + 1) % texts.length;
      onSlideComplete?.();
      isAnimating.current = false;
    },
    [texts, setSlotAText, setSlotBText, onSlideComplete],
  );

  const advanceSlide = useCallback(() => {
    if (texts.length <= 1 || isAnimating.current || containerWidth === 0) {
      return;
    }
    isAnimating.current = true;

    // Snapshot JS-thread values before entering the worklet
    const aIsFront = frontIsA.current;
    const capturedIdx = upcomingIndex.current;
    const frontX = aIsFront ? slotAX : slotBX;
    const backX = aIsFront ? slotBX : slotAX;

    // Slide the front slot out to the left, the back slot in from the right
    frontX.value = withTiming(-containerWidth, { duration: SLIDE_DURATION_MS });
    backX.value = withTiming(0, { duration: SLIDE_DURATION_MS }, (finished) => {
      if (finished) {
        // Teleport the departing slot off-screen right while still invisible
        frontX.value = containerWidth;
        // Hand off all ref mutations back to the JS thread
        runOnJS(onSlideEnd)(aIsFront, capturedIdx);
      }
    });
  }, [texts.length, containerWidth, slotAX, slotBX, onSlideEnd]);

  useEffect(() => {
    if (texts.length <= 1) return undefined;
    const interval = setInterval(advanceSlide, ROTATE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [texts.length, advanceSlide]);

  const handleContainerLayout = useCallback(
    (e: { nativeEvent: { layout: { width: number } } }) => {
      const { width } = e.nativeEvent.layout;
      if (width !== containerWidth) {
        setContainerWidth(width);
      }
    },
    [containerWidth],
  );

  if (texts.length <= 1) {
    return (
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextDefault}
        numberOfLines={2}
      >
        {texts[0] ?? ''}
      </Text>
    );
  }

  return (
    <Box
      twClassName="h-[44px]"
      style={styles.overflowHidden}
      onLayout={handleContainerLayout}
    >
      <Animated.View style={[styles.slidingText, slotAStyle]}>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextDefault}
          numberOfLines={2}
        >
          {slotAText}
        </Text>
      </Animated.View>
      <Animated.View style={[styles.slidingText, slotBStyle]}>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextDefault}
          numberOfLines={2}
        >
          {slotBText}
        </Text>
      </Animated.View>
    </Box>
  );
};

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

  const displayTexts = useMemo(() => {
    const descriptions = report.trends
      .map((t) => t.description)
      .filter(Boolean);
    return descriptions.length > 0 ? descriptions : [report.summary];
  }, [report.trends, report.summary]);

  const handleSlideComplete = useCallback(() => {
    setBorderAnimationKey((k) => k + 1);
  }, []);

  const handleVisible = useCallback(() => {
    setBorderAnimationKey((k) => k + 1);

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
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
          >
            {strings('market_insights.title')}
          </GradientText>
          <ArrowRightSVG
            name="arrow-right"
            width={ARROW_ICON_SIZE}
            height={ARROW_ICON_SIZE}
            fill={GRADIENT_COLORS[1]}
          />
        </Box>

        {/* Body text: rotating trend descriptions */}
        <SlidingTextCarousel
          texts={displayTexts}
          onSlideComplete={handleSlideComplete}
        />

        {/* Footer disclaimer */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={1}
        >
          <GradientSparkleIcon />
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
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
