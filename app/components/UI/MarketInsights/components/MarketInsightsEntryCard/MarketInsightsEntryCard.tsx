import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, useWindowDimensions, type View } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  Icon,
  IconName,
  IconSize,
  IconColor,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { MarketInsightsEntryCardProps } from './MarketInsightsEntryCard.types';
import { endTrace, TraceName } from '../../../../../util/trace';
import { AnimatedGradientBorder } from './AnimatedGradientBorder';
import {
  VISIBILITY_CHECK_INTERVAL_MS,
  VISIBILITY_THRESHOLD,
} from './AnimatedGradientBorder.constants';

const SparkleIcon: React.FC = () => (
  <Icon name={IconName.Ai} size={IconSize.Lg} color={IconColor.IconDefault} />
);

/**
 * Polls `measureInWindow` on the given ref until the element is at least
 * `threshold` visible on screen. Returns true once, then stops polling.
 */
function useVisibilityOnce(
  ref: React.RefObject<View | null>,
  threshold: number,
): boolean {
  const [triggered, setTriggered] = useState(false);
  const { height: screenHeight } = useWindowDimensions();

  useEffect(() => {
    if (triggered || !ref.current) return;

    const check = () => {
      ref.current?.measureInWindow?.(
        (_x: number, y: number, _w: number, h: number) => {
          if (h === 0) return;
          const visibleTop = Math.max(y, 0);
          const visibleBottom = Math.min(y + h, screenHeight);
          const visibleHeight = Math.max(visibleBottom - visibleTop, 0);
          if (visibleHeight / h >= threshold) {
            setTriggered(true);
          }
        },
      );
    };

    check();
    const id = setInterval(check, VISIBILITY_CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [triggered, ref, screenHeight, threshold]);

  return triggered;
}

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
  const cardRef = useRef<View>(null);
  const [cardDimensions, setCardDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const shouldAnimate = useVisibilityOnce(cardRef, VISIBILITY_THRESHOLD);

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
      setCardDimensions({ width, height });
    },
    [],
  );

  return (
    <Pressable
      ref={cardRef}
      onPress={onPress}
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
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('market_insights.footer_disclaimer')}
          </Text>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {'•'}
          </Text>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {timeAgo}
          </Text>
        </Box>
      </Box>
    </Pressable>
  );
};

export default MarketInsightsEntryCard;
